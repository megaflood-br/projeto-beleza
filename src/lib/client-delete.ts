export function parseClientIds(value: string) {
  return [...new Set(value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];
}

export function clientDeleteCopy(count: number, scope: "one" | "selected" | "all") {
  if (scope === "all") {
    return {
      title: count === 1 ? "Excluir o cliente deste salão?" : `Excluir os ${count.toLocaleString("pt-BR")} clientes deste salão?`,
      description: "Agendamentos, comandas e o histórico desses clientes também serão apagados. Esta ação não pode ser desfeita.",
    };
  }
  if (scope === "one" || count === 1) {
    return {
      title: "Excluir este cliente?",
      description: "Agendamentos, comandas e o histórico deste cliente também serão apagados. Esta ação não pode ser desfeita.",
    };
  }
  return {
    title: `Excluir os ${count.toLocaleString("pt-BR")} clientes selecionados?`,
    description: "Agendamentos, comandas e o histórico desses clientes também serão apagados. Esta ação não pode ser desfeita.",
  };
}
