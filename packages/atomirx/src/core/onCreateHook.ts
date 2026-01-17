import { hook } from "./hook";
import { Atom, AtomMeta, MutableAtom, ModuleMeta } from "./types";

export interface MutableAtomCreateInfo {
  type: "mutable";
  key: string | undefined;
  meta: AtomMeta | undefined;
  atom: MutableAtom<any, any>;
}

export interface DerivedAtomCreateInfo {
  type: "derived";
  key: string | undefined;
  meta: AtomMeta | undefined;
  atom: Atom<any, any>;
}

export type AtomCreateInfo = MutableAtomCreateInfo | DerivedAtomCreateInfo;

export interface ModuleCreateInfo {
  type: "module";
  key: string | undefined;
  meta: ModuleMeta | undefined;
  module: unknown;
}

export const onCreateHook =
  hook<(info: AtomCreateInfo | ModuleCreateInfo) => void>();
