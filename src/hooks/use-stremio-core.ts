"use client";

import { useContext } from "react";
import { StremioCoreContext } from "../providers/StremioCoreProvider";


export const useStremioCore = () => {
    const context = useContext(StremioCoreContext);
    if (context === undefined) {
        throw new Error("useStremioCore must be used within a StremioCoreProvider");
    }
    return context;
};