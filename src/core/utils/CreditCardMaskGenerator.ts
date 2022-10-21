import creditCardType from "credit-card-type";

export function creditCardMaskGenerator(bin: string, cardNumberLength?: number): string {
  const possibleCards = creditCardType(bin);

  if (possibleCards.length > 1) {
    console.log("More than one possible card type for given bin: " + JSON.stringify(possibleCards));
  }

  const card = possibleCards[0];

  const cardLength = !cardNumberLength ? card.lengths[0] : cardNumberLength;

  let mask = bin + "X".repeat(cardLength - bin.length);

  const gaps = card.gaps;

  gaps.forEach((gap: number, index: number) => {
    const cutIndex = gap + index;
    const firstPart = mask.slice(0, cutIndex);
    const secondPart = mask.slice(cutIndex);

    mask = firstPart + " " + secondPart;
  });

  return mask;
}
