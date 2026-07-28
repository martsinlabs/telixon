import { CorpusEntry, Oracle } from '../../oracle';
import { deriveDisplayVariants } from './derive-display-variants';
import { deriveExtensionVariants } from './derive-extension-variants';
import { deriveMutations } from './derive-mutations';
import { CorpusCase, RenderedExample } from './models';

// One parse condition per case (same input + different region = different case); example cases also keep their region attribution, since shared-calling-code regions can carry byte-identical examples.
function caseIdentity(corpusCase: CorpusCase): string {
  const regionScope: string = corpusCase.kind === 'example' ? corpusCase.regionCode : '';
  return `${regionScope}|${corpusCase.defaultRegion ?? ''}|${corpusCase.input}`;
}

// Examples first, so a derived case that collides with a canonical one is dropped, not the reverse.
function dedupeCases(cases: readonly CorpusCase[]): CorpusCase[] {
  const seen = new Set<string>();
  const unique: CorpusCase[] = [];
  for (const corpusCase of cases) {
    const identity = caseIdentity(corpusCase);
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(corpusCase);
  }
  return unique;
}

function toExampleCase(example: CorpusEntry): CorpusCase {
  return {
    family: 'example',
    kind: 'example',
    input: example.e164,
    regionCode: example.regionCode,
    sourceE164: example.e164,
  };
}

// Pairs every example with Google's rendering; an example Google cannot parse is excluded and surfaces through the example-family skip counter.
function renderExamples(oracle: Oracle, examples: readonly CorpusEntry[]): RenderedExample[] {
  const renderedExamples: RenderedExample[] = [];
  for (const example of examples) {
    const rendered = oracle.evaluate(example.e164);
    if (rendered) renderedExamples.push({ example, rendered });
  }
  return renderedExamples;
}

// The full conformance corpus: every Google example, every display spelling, and every deterministic mutation, deduplicated to one case per parse condition.
export function buildConformanceCorpus(oracle: Oracle, examples: readonly CorpusEntry[]): CorpusCase[] {
  const renderedExamples = renderExamples(oracle, examples);
  return dedupeCases([
    ...examples.map(toExampleCase),
    ...deriveDisplayVariants(renderedExamples),
    ...deriveExtensionVariants(renderedExamples),
    ...deriveMutations(renderedExamples),
  ]);
}
