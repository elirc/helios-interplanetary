import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectReceipts as subject } from '../../interview-03/_interviewer/reference.mjs';
const examples=[
  {
    "label": "Same command in two scopes with a result conflict",
    "args": [
      [
        {
          "org": "A",
          "id": "K",
          "fingerprint": "P",
          "result": "ok"
        },
        {
          "org": "A",
          "id": "K",
          "fingerprint": "P",
          "result": "ok"
        },
        {
          "org": "B",
          "id": "K",
          "fingerprint": "Q",
          "result": "ok"
        },
        {
          "org": "A",
          "id": "K",
          "fingerprint": "P",
          "result": "other"
        }
      ]
    ],
    "expected": [
      {
        "org": "A",
        "id": "K",
        "state": "conflict",
        "attempts": 3
      },
      {
        "org": "B",
        "id": "K",
        "state": "consistent",
        "attempts": 1
      }
    ]
  },
  {
    "label": "Tuple identity avoids separator collisions",
    "args": [
      [
        {
          "org": "A|B",
          "id": "C",
          "fingerprint": "p",
          "result": "ok"
        },
        {
          "org": "A",
          "id": "B|C",
          "fingerprint": "p",
          "result": "ok"
        }
      ]
    ],
    "expected": [
      {
        "org": "A|B",
        "id": "C",
        "state": "consistent",
        "attempts": 1
      },
      {
        "org": "A",
        "id": "B|C",
        "state": "consistent",
        "attempts": 1
      }
    ]
  },
  {
    "label": "No observations produce no groups",
    "args": [
      []
    ],
    "expected": []
  }
];
function freeze(value) {
  if(value && typeof value==='object') {
    for(const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
for(const example of examples) {
  test(example.label,()=>{
    const args=structuredClone(example.args);
    const before=structuredClone(args);
    freeze(args);
    assert.deepEqual(subject(...args),example.expected);
    assert.deepEqual(args,before);
  });
}
