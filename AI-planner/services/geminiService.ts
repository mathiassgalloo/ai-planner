import { GoogleGenAI, Type } from "@google/genai";
import { GeminiParsedTask, Task, Priority } from "../types";

const apiKey = process.env.API_KEY;

const getAIClient = () => {
    if (!apiKey) {
        console.error("API Key is missing");
        throw new Error("API Key saknas. Vänligen kontrollera din konfiguration.");
    }
    return new GoogleGenAI({ apiKey });
};

export const parseTextToTasks = async (text: string): Promise<GeminiParsedTask[]> => {
  const ai = getAIClient();
  const currentDate = new Date().toISOString();
  
  const prompt = `
    Du är en smart personlig assistent.
    Användaren matar in text som ska bli en uppgift.
    
    Din absolut viktigaste regel är: **SAMMANFOGA TILL EN UPPGIFT**.
    
    Exempel 1 (Vanlig input):
    Input: "Boka möte med Anna på tisdag och förbered protokollet innan dess"
    Resultat: 
    - Title: "Boka möte med Anna"
    - Description: "Förbered även protokollet innan dess."
    - Checklist: [] (TOM!)
    
    Exempel 2 (Mötesanteckningar):
    Input: "Mötesanteckningar (Rubrik: Projektstart)\n• Gör klart budget\n• Ring kund"
    Resultat:
    - Title: "Möte: Projektstart" (eller liknande)
    - Description: "Anteckningar från mötet..."
    - Checklist: ["Gör klart budget", "Ring kund"] (HÄR ska punkterna hamna)
    
    Instruktioner:
    1. **Skapa EN (1) uppgift** av inputen. Dela ALDRIG upp det i flera uppgifter.
    2. **Checklistor:** 
       - Om inputen är vanlig text: Checklist ska vara TOM. Lägg detaljer i 'description'.
       - Om inputen startar med "Mötesanteckningar" eller liknande struktur: Lägg alla "att-göra" punkter i 'checklist'.
    3. **Beskrivning:** Om det finns flera moment, lägg det i beskrivningsfältet.
    4. **VIKTIGT OM DETALJER:** Om användaren nämner ett företagsnamn (t.ex. "Bravida", "Metrolit") eller en person (t.ex. "Viktor", "Anna"), MÅSTE detta stå kvar tydligt i Titeln eller Beskrivningen. Det får INTE tas bort bara för att det också läggs i 'tags'.
    5. **Datum & Tid:** Nuvarande tid är ${currentDate}.
       - Om datum anges men INGEN tid: Sätt tiden till 08:00:00 (ISO).
       - Om tid anges: Använd den.
    6. **Taggar:** Identifiera Företag (t.ex. Bravida), Personer (Förnamn/Efternamn), Platser.
    
    Returnera en lista med JSON-objekt (oftast bara ett objekt).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: text,
      config: {
        systemInstruction: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Kort, tydlig rubrik på uppgiften" },
              description: { type: Type.STRING, description: "Mer detaljerad beskrivning om det finns" },
              type: { type: Type.STRING, enum: ["TODO", "CALL", "MEETING", "EMAIL", "NOTE"] },
              deadline: { type: Type.STRING, description: "ISO 8601 datumsträng (YYYY-MM-DDTHH:mm:ss.sssZ) om deadline finns, annars null" },
              priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
              tags: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "Lista med identifierade företag, personnamn, städer eller länder" 
              },
              checklist: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Endast om användaren uttryckligen bett om en lista eller om det är mötesanteckningar."
              },
              estimatedDuration: { type: Type.STRING, description: "Uppskattad tid t.ex '30 min', '1h'" }
            },
            required: ["title", "type", "priority"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeminiParsedTask[];
    }
    return [];
  } catch (error) {
    console.error("Error parsing text with Gemini:", error);
    throw error;
  }
};

export const enhanceTaskContent = async (title: string): Promise<{ description: string, checklist: string[] }> => {
    const ai = getAIClient();
    
    const prompt = `
      Användaren har skapat en uppgift med titeln: "${title}".
      Din uppgift är att:
      1. Skriva en kort, professionell beskrivning av vad uppgiften sannolikt innebär.
      2. Skapa en konkret checklista på 3-5 steg för att utföra uppgiften effektivt.
      Svara på svenska.
    `;
  
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: title,
      config: {
        systemInstruction: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            checklist: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });
  
    if (response.text) {
      return JSON.parse(response.text);
    }
    return { description: "", checklist: [] };
};

export const suggestTaskSchedule = async (task: Task): Promise<{ deadline: string, estimatedDuration: string }> => {
    const ai = getAIClient();
    const currentDate = new Date().toISOString();

    const prompt = `
      Jag har en uppgift: "${task.title}" (${task.description || ''}).
      Det är nu: ${currentDate}.
      
      Föreslå:
      1. Ett realistiskt datum och klockslag (börja tidigast imorgon om det inte är akut). Förlägg administrativa uppgifter till morgon/fm och möten till em om inget annat framgår.
      2. En uppskattad tidsåtgång (t.ex. "15 min", "1h").
      
      Svara endast med JSON.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Uppgift: ${task.title}`,
        config: {
            systemInstruction: prompt,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    deadline: { type: Type.STRING, description: "ISO 8601 Datumsträng" },
                    estimatedDuration: { type: Type.STRING }
                }
            }
        }
    });

    if(response.text) {
        return JSON.parse(response.text);
    }
    return { deadline: currentDate, estimatedDuration: "30 min" };
}