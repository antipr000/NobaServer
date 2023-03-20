export type CountryProps = {
  alpha3: string;
  alpha2: string;
  extensionCode: string;
  name: string;
};

export const countryPropsMap: Record<string, CountryProps> = {
  US: {
    alpha3: "USA",
    alpha2: "US",
    extensionCode: "+1",
    name: "United States of America",
  },
  CO: {
    alpha3: "COL",
    alpha2: "CO",
    extensionCode: "+57",
    name: "Colombia",
  },
};
