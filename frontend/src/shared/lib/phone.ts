// Маска российского номера: +7 (XXX) XXX-XX-XX
// Любой ввод приводится к этому формату; ведущая 8 заменяется на 7.
export const formatRussianPhone = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (!digits.startsWith("7")) digits = "7" + digits;
  digits = digits.slice(0, 11);
  const d = digits.slice(1);
  let out = "+7";
  if (d.length > 0) out += " (" + d.slice(0, 3);
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += " " + d.slice(3, 6);
  if (d.length > 6) out += "-" + d.slice(6, 8);
  if (d.length > 8) out += "-" + d.slice(8, 10);
  return out;
};

export const isValidRussianPhone = (value: string): boolean => {
  const digits = (value || "").replace(/\D/g, "");
  return digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"));
};
