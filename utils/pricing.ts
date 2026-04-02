// Assumes discount is validated (0–100) before calling
export const calculateFinalPrice = (
  originalPrice: number,
  discount?: number
): number => {
  if (!discount || discount <= 0) return originalPrice;
  return Math.round(originalPrice * (1 - discount / 100));
};
