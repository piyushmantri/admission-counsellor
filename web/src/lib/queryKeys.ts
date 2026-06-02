export const keys = {
  students: () => ["students"] as const,
  student: (chatId: string) => ["students", chatId] as const,
  colleges: () => ["colleges"] as const,
  college: (id: string) => ["colleges", id] as const,
  botConfig: () => ["botConfig"] as const,
  recommendations: (chatId: string) => ["recommendations", chatId] as const,
};
