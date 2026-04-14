
// Declaración explícita para el módulo @google/genai
// Esto fuerza a TypeScript a tratarlo como 'any' si no encuentra los tipos oficiales
declare module '@google/genai' {
  export const GoogleGenAI: any;
  export const Type: any;
  export const SchemaType: any;
}
