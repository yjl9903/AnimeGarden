export const useDocument = () => {
  return import.meta.env.SSR ? undefined : document;
};
