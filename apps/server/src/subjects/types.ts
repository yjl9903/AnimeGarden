export interface IndexOptions {
  /**
   * Overwrite exisiting subject id
   *
   * @default false
   */
  overwrite?: boolean;
}

export interface InsertSubjectOptions extends IndexOptions {
  /**
   * @default false
   */
  indexResources?: boolean;

  /**
   * @default false
   */
  pushTelegramMessage?: boolean;
}
