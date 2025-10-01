// scripts/generate-client.ts
import { createFromRoot } from "codama";
import { rootNodeFromAnchor, type AnchorIdl } from "@codama/nodes-from-anchor";
import { renderVisitor as renderJavaScriptVisitor } from "@codama/renderers-js";
import idl from "../programs/Turbin3_prereq.json"; // your downloaded IDL
import path from "path";

const root = rootNodeFromAnchor(idl as AnchorIdl);
const codama = createFromRoot(root);

const outDir = path.join(import.meta.dirname, "..", "clients", "js", "src", "generated");
codama.accept(renderJavaScriptVisitor(outDir));

console.log("Generated client at:", outDir);
