import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Escribe una descripción técnica y comercial breve (máximo 25 palabras) para un producto de ferretería. 
      Producto: ${productName}. 
      Categoría: ${category}.
      Idioma: Español.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error generating description:", error);
    return "Descripción no disponible en este momento.";
  }
};

export const analyzeSalesTrends = async (salesSummary: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Actúa como un analista de negocios experto para una ferretería.
      Analiza los siguientes datos de ventas resumidos y dame 3 consejos estratégicos breves para mejorar la rentabilidad o el stock.
      Datos: ${salesSummary}
      Formato: Lista de 3 puntos.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error analyzing trends:", error);
    return "No se pudo generar el análisis en este momento.";
  }
};