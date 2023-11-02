import { yieldStream } from "yield-stream";
import { CreateCompletionResponseChoicesInner, OpenAI } from "openai-streams";
import { OpenAISettings, HFInferenceSettings } from './types.ts';


const convertHFInferenceToOpenAI = (chunk) => {
  return {
    choices: [{
      index: 0,
      delta: {
        content: chunk.token.text
      },
      finish_reason: chunk.details?.finish_reason || null
    }].concat((chunk.top_tokens || []).map((tok, i) => ({
      index: i + 1,
      delta: {
        content: " " + tok.text,
      },
      finish_reason: chunk.details?.finish_reason || null
    })))
  };
};

const makeRequest = async (requestType, {
  // TODO: Allow customizing.
  settings,
  prompt,
  n,
  messages,
}: {
  settings: HFInferenceSettings | OpenAISettings,
  prompt?: string,
  n: number,
  messages?: List<{
    role: string,
    content: string
  }>,
}, { apiKey, abortController, onChunk }: {
  apiKey: string,
  abortController: AbortController,
  onChunk: (choice) => void,
}) => {
  let stream;
  if (settings.modelSource === 'openai') {
    stream = await OpenAI(
      requestType, {
      // TODO: Allow customizing.
      model: settings.model,
      temperature: settings.temperature,
      prompt,
      n,
      messages,
      max_tokens: settings.max_tokens,
      stop: ["\n\n", "assistant:", "user:"],
    }, { apiKey: apiKey!, mode: "raw" }
    );
  } else {
    let inputs = prompt;
    if (messages) {
      inputs = '';
      messages.forEach(msg => {
        inputs += `${msg.role}: ${msg.content}\n\n`;
      });
      inputs += 'Bot:';
    }
    const parameters = {
      model: settings.model,
      details: true,
      temperature: Math.min(Math.max(0.00001, settings.temperature), 2),
      max_new_tokens: settings.max_tokens || 512,
      stop: ["\n\n", "Bot:", "User:"],
    };
    if (n > 1) parameters['top_n_tokens'] = n - 1;
    const request = await fetch(settings.apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        //'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        inputs,
        parameters,
        stream: true,
      })
    });
    stream = request.body;

    const DECODER = new TextDecoder();
    for await (const chunk of yieldStream(stream, abortController)) {
      if (abortController.signal.aborted) break;
      let decoded = 'not decoded';
      try {
        decoded = DECODER.decode(chunk);
        if (settings.modelSource === 'openai') {
          const { choices } = JSON.parse(decoded);
          if (choices === undefined)
            throw new Error(
              "No choices in response. Decoded response: " + JSON.stringify(decoded)
            );
          onChunk(choices[0]);
        } else {
          decoded
            .split('data:')
            .filter(d => !!d)
            .map(decoded => {
              const { choices } = convertHFInferenceToOpenAI(JSON.parse(decoded))
              if (choices === undefined)
                throw new Error(
                  "No choices in response. Decoded response: " + JSON.stringify(decoded)
                );

              choices.map(onChunk);
            });
        }
      } catch (err) {
        console.error(err);
        console.info("chunk", chunk);
        console.info("decoded", decoded);
      }
    }

  }
};

export default makeRequest;
