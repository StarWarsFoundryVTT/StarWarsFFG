import { type Symbol } from "./types";
export type CostType = {
    [key in Symbol]?: number;
};
type Hint = {
    description: string;
    cost: CostType;
};
export declare const hints: Hint[];
export declare function hintCostDisplayText(hint: Hint): string;
export {};
