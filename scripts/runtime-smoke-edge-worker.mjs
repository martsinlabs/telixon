/* global Response */
// The worker half of the edge runtime smoke: runs inside workerd, imports the edge build, and
// reports the quick-start assertions through its fetch handler.
import { ensureEngineReady, parsePhoneNumber } from '../packages/core/dist/index.edge.js';

export default {
  async fetch() {
    await ensureEngineReady();
    const international = parsePhoneNumber('+12015550123');
    const national = parsePhoneNumber('(415) 555-0132', { defaultRegion: 'US' });
    return Response.json({
      valid: international.isValid(),
      region: international.getRegion(),
      e164: international.formatE164(),
      nationalE164: national.formatE164(),
    });
  },
};
