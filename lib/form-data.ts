const getFormString = (formData: FormData, name: string) => {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
};

const emptyStringToUndefined = (value: string) => {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

export { emptyStringToUndefined, getFormString };
