export interface IndexOptions {
  /**
   * Modify resources released days before onair
   *
   * @default 30
   */
  offset?: number;

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
}
