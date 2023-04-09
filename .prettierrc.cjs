module.exports = {
  semi: true,
  singleQuote: true,
  printWidth: 100,
  trailingComma: "none",
  plugins: [require.resolve("prettier-plugin-astro")],
  overrides: [
    {
      files: "*.astro",
      options: {
        parser: "astro",
      },
    },
  ],
};