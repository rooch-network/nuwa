// Defines the possible types of values during NuwaScript execution.
export type NuwaValue =
  | string
  | number // Use standard JavaScript number type (IEEE 754 double)
  | boolean
  | null
  | NuwaValue[] // Represents lists/arrays
  | NuwaObject; // Represents objects/maps

// Explicit type for NuwaScript objects for clarity
export type NuwaObject = { [key: string]: NuwaValue };

// --- Type Checking Helper Functions ---

export function isNuwaObject(value: NuwaValue): value is NuwaObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNuwaList(value: NuwaValue): value is NuwaValue[] {
  return Array.isArray(value);
}

export function isNuwaString(value: NuwaValue): value is string {
  return typeof value === 'string';
}

export function isNuwaNumber(value: NuwaValue): value is number {
  return typeof value === 'number';
}

export function isNuwaBoolean(value: NuwaValue): value is boolean {
  return typeof value === 'boolean';
}

export function isNuwaNull(value: NuwaValue): value is null {
    return value === null;
}

// --- Equality Comparison ---
// Handles nested structures. Be cautious with circular references if they become possible.
export function nuwaValuesAreEqual(v1: NuwaValue, v2: NuwaValue): boolean {
  if (v1 === v2) {
    return true; // Handles primitives and null comparison, plus same object reference
  }

  if (typeof v1 !== typeof v2) {
    return false; // Different types
  }

  if (v1 === null || v2 === null) {
      return v1 === v2; // Already covered by === but explicit
  }

  if (isNuwaList(v1) && isNuwaList(v2)) {
    if (v1.length !== v2.length) {
      return false;
    }
    for (let i = 0; i < v1.length; i++) {
      if (!nuwaValuesAreEqual(v1[i]!, v2[i]!)) {
        return false;
      }
    }
    return true;
  }

  if (isNuwaObject(v1) && isNuwaObject(v2)) {
    const keys1 = Object.keys(v1);
    const keys2 = Object.keys(v2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (const key of keys1) {
      if (!keys2.includes(key) || !nuwaValuesAreEqual(v1[key]!, v2[key]!)) {
        return false;
      }
    }
    return true;
  }

  // Fallback for any other case (shouldn't happen with exhaustive checks above)
  return false;
}

// --- String Representation (for PRINT or debugging) ---
export function nuwaValueToString(value: NuwaValue): string {
    if (value === null) {
        return 'null';
    }
    if (isNuwaList(value)) {
        // Avoid deep/circular structures in default toString
        return `[List(${value.length})]`; // Simple representation
        // Or implement a limited depth JSON.stringify like approach if needed
    }
    if (isNuwaObject(value)) {
        return `{Object(${Object.keys(value).length} keys)}`; // Simple representation
    }
    // For primitives, use standard conversion
    return String(value);
}
