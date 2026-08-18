import type { EditedField, FishingRecord } from '../types/record'

const ALLOWED: ReadonlySet<string> = new Set(['recordedAt', 'location'])

export function normalizeEditedFields(value: unknown): EditedField[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<EditedField>()
  for (const item of value) {
    if (typeof item === 'string' && ALLOWED.has(item)) {
      unique.add(item as EditedField)
    }
  }
  return [...unique]
}

export function hasEditedField(
  record: FishingRecord,
  field: EditedField,
): boolean {
  return record.editedFields.includes(field)
}

export function withEditedField(
  fields: EditedField[],
  field: EditedField,
): EditedField[] {
  return fields.includes(field) ? fields : [...fields, field]
}
