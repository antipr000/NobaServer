export const EMPLOYEE_LOAD_CSV_HEADER_VALUES = {
  getOrDefault: (templateObject: object, locale: string): string => {
    locale = locale?.toLowerCase() ?? "en";
    if (templateObject[locale]) {
      return templateObject[locale];
    }

    const localePrefix = locale.split("_")[0];

    if (templateObject[localePrefix]) {
      return templateObject[localePrefix];
    }

    return templateObject["en"];
  },
  email: {
    en: "Email",
    es: "Correo electrónico",
  },
  firstName: {
    en: "First Name",
    es: "Nombre",
  },
  lastName: {
    en: "Last Name",
    es: "Apellido",
  },
  salary: {
    en: "Salary",
    es: "Salario",
  },
};
