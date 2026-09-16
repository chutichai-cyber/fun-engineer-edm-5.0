export function roundHalfUp(value, decimals = 2) {
  return Number(Math.round(parseFloat(value + 'e' + decimals)) + 'e-' + decimals);
}

export function calculateShares(totalAmount, participantCount) {
  const total = parseFloat(totalAmount) || 0;

  if (participantCount === 0) {
    return { perPerson60: 0, perPerson40: 0, totalPerPerson: 0, documentRemainder: roundHalfUp(total) };
  }

  const portion60 = total * 0.6;
  const portion40 = total * 0.4;

  const perPerson60 = roundHalfUp(portion60 / participantCount);
  const perPerson40 = roundHalfUp(portion40 / participantCount);

  const distributed60 = roundHalfUp(perPerson60 * participantCount);
  const distributed40 = roundHalfUp(perPerson40 * participantCount);
  const documentRemainder = roundHalfUp(total - distributed60 - distributed40);

  return {
    perPerson60,
    perPerson40,
    totalPerPerson: roundHalfUp(perPerson60 + perPerson40),
    documentRemainder,
  };
}
