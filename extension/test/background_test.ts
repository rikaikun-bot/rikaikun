import { RcxMain } from '../rikaichan';
import { expect, use } from '@esm-bundle/chai';
import chrome from 'sinon-chrome';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

use(sinonChai);

let rcxMain: RcxMain;

describe('background.ts', () => {
  before(async () => {
    // Resolve config fetch with minimal config object.
    chrome.storage.sync.get.yields({ kanjiInfo: [] });
    // Imports only run once so run in `before` to make it deterministic.
    rcxMain = await (await import('../background')).TestOnlyRxcMainPromise;
  });

  beforeEach(() => {
    // Only reset the spies we're using since we need to preserve
    // the state of `chrome.runtime.onMessage.addListener` for invoking
    // the core functionality of background.ts.
    chrome.tabs.sendMessage.reset();
  });

  describe('when sent "forceDocsHtml?" message', () => {
    it('should not call response callback when rikaikun disabled', async () => {
      rcxMain.enabled = 0;
      const responseCallback = sinon.spy();

      await sendMessageToBackground({
        type: 'forceDocsHtml?',
        responseCallback: responseCallback,
      });

      expect(responseCallback).to.have.not.been.called;
    });

    it('should not send "showPopup" message when rikaikun disabled', async () => {
      rcxMain.enabled = 0;

      await sendMessageToBackground({
        type: 'forceDocsHtml?',
      });

      expect(chrome.tabs.sendMessage).to.have.not.been.called;
    });

    it('should pass true to response callback when rikaikun enabled', async () => {
      rcxMain.enabled = 1;
      const responseCallback = sinon.spy();

      await sendMessageToBackground({
        type: 'forceDocsHtml?',
        responseCallback: responseCallback,
      });

      expect(responseCallback).to.have.been.calledOnceWith(true);
    });

    it('should send "showPopup" message when rikaikun enabled', async () => {
      rcxMain.enabled = 1;

      await sendMessageToBackground({
        type: 'forceDocsHtml?',
      });

      expect(chrome.tabs.sendMessage).to.have.been.calledWith(
        /* tabId= */ sinon.match.any,
        sinon.match({ type: 'showPopup' })
      );
    });
  });
});

async function sendMessageToBackground({
  type,
  responseCallback = () => {},
}: {
  type: string;
  responseCallback?: Function;
}): Promise<void> {
  return await chrome.runtime.onMessage.addListener.yield(
    { type: type },
    { tab: { id: 0 } },
    responseCallback
  );
}
