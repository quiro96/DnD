export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const getModifier = (score) => Math.floor(((score || 10) - 10) / 2);