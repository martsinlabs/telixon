import { SLOT_ATTRIBUTE } from '../constants/markup';

/** Matches the `<template>` child of the picker that carries `slot`. */
export function templateSelector(slot: string): string {
  return `:scope > template[${SLOT_ATTRIBUTE}="${slot}"]`;
}
