#!/usr/bin/env node
import { DicePool, RollResult } from "./types";
export declare function parseDiceNotation(input: string): DicePool;
export declare const formatResult: (result: RollResult) => string;
export declare const main: () => void;
