export function nonNullableArray<T>(array: T[]) {
	return array.filter(Boolean) as NonNullable<T>[];
}

export function formatNumber(value: number): string {
	return value.toLocaleString("en-US");
}
