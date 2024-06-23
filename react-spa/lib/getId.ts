export const generateId = () => {
  // a 5 character random string 
  return Math.random().toString(36).substr(2, 5);
}