export type DidRegistry = {
  "version": "0.1.0",
  "name": "did_registry",
  "instructions": [
    {
      "name": "createKeyRegistry",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerDid",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "The authority that owns the registry"
          ]
        },
        {
          "name": "did",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The DID to add to the registry. This is the did \"identifier\", not the did account",
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority."
          ]
        },
        {
          "name": "didAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here"
          ]
        }
      ],
      "args": [
        {
          "name": "didBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "removeDid",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "The authority that owns the registry"
          ]
        },
        {
          "name": "did",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The DID to remove from the registry"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "keyRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "dids",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "controllerRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "did",
            "type": "publicKey"
          },
          {
            "name": "controlledDids",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "DIDError",
      "msg": "An error occurred evaluating the DID"
    },
    {
      "code": 6001,
      "name": "NotAuthority",
      "msg": "The key is not an authority on the DID"
    },
    {
      "code": 6002,
      "name": "DIDRegistered",
      "msg": "The DID is already registered"
    },
    {
      "code": 6003,
      "name": "DIDNotRegistered",
      "msg": "Attempt to remove a DID that is not registered"
    }
  ]
};

export const IDL: DidRegistry = {
  "version": "0.1.0",
  "name": "did_registry",
  "instructions": [
    {
      "name": "createKeyRegistry",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "registerDid",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "The authority that owns the registry"
          ]
        },
        {
          "name": "did",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The DID to add to the registry. This is the did \"identifier\", not the did account",
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority."
          ]
        },
        {
          "name": "didAccount",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here"
          ]
        }
      ],
      "args": [
        {
          "name": "didBump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "removeDid",
      "accounts": [
        {
          "name": "registry",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true,
          "docs": [
            "The authority that owns the registry"
          ]
        },
        {
          "name": "did",
          "isMut": false,
          "isSigner": false,
          "docs": [
            "The DID to remove from the registry"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "keyRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "dids",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "controllerRegistry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "version",
            "type": "u8"
          },
          {
            "name": "did",
            "type": "publicKey"
          },
          {
            "name": "controlledDids",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "DIDError",
      "msg": "An error occurred evaluating the DID"
    },
    {
      "code": 6001,
      "name": "NotAuthority",
      "msg": "The key is not an authority on the DID"
    },
    {
      "code": 6002,
      "name": "DIDRegistered",
      "msg": "The DID is already registered"
    },
    {
      "code": 6003,
      "name": "DIDNotRegistered",
      "msg": "Attempt to remove a DID that is not registered"
    }
  ]
};
