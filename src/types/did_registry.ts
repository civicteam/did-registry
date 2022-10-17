export type DidRegistry = {
  version: "0.1.0";
  name: "did_registry";
  instructions: [
    {
      name: "createKeyRegistry";
      docs: ["Create an empty DID registry for a given solana key"];
      accounts: [
        {
          name: "registry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "bump";
          type: "u8";
        }
      ];
    },
    {
      name: "registerDid";
      docs: ["Add a DID to an authority's registry"];
      accounts: [
        {
          name: "registry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
          docs: ["The authority that owns the registry"];
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority."
          ];
        },
        {
          name: "didAccount";
          isMut: false;
          isSigner: false;
          docs: [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here"
          ];
        }
      ];
      args: [
        {
          name: "didBump";
          type: "u8";
        }
      ];
    },
    {
      name: "removeDid";
      docs: ["Remove a DID from an authority's registry"];
      accounts: [
        {
          name: "registry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: false;
          isSigner: true;
          docs: ["The authority that owns the registry"];
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: ["The DID to remove from the registry"];
        }
      ];
      args: [];
    },
    {
      name: "registerDidForEthAddress";
      docs: [
        "Add a DID to an eth address's registry, if the solana signer is also an authority"
      ];
      accounts: [
        {
          name: "registry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority."
          ];
        },
        {
          name: "didAccount";
          isMut: false;
          isSigner: false;
          docs: [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here"
          ];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ethAddress";
          type: {
            array: ["u8", 20];
          };
        },
        {
          name: "didBump";
          type: "u8";
        }
      ];
    },
    {
      name: "registerDidSignedByEthAddress";
      docs: [
        "Add a DID to an eth address's registry, without requiring the solana signer to be an authority on the DID"
      ];
      accounts: [
        {
          name: "registry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "did";
          isMut: false;
          isSigner: false;
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the payer."
          ];
        },
        {
          name: "didAccount";
          isMut: false;
          isSigner: false;
          docs: [
            "The account containing the DID document",
            "This can safely be a DidAccount, rather than UncheckedAccount,",
            "since, for the DID to include an eth address it must be a non-generative DID."
          ];
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ethAddress";
          type: {
            array: ["u8", 20];
          };
        },
        {
          name: "ethSignature";
          type: {
            defined: "Secp256k1RawSignature";
          };
        },
        {
          name: "didBump";
          type: "u8";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "keyRegistry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "version";
            type: "u8";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "dids";
            type: {
              vec: "publicKey";
            };
          }
        ];
      };
    },
    {
      name: "controllerRegistry";
      type: {
        kind: "struct";
        fields: [
          {
            name: "version";
            type: "u8";
          },
          {
            name: "did";
            type: "publicKey";
          },
          {
            name: "controlledDids";
            type: {
              vec: "publicKey";
            };
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "Secp256k1RawSignature";
      type: {
        kind: "struct";
        fields: [
          {
            name: "signature";
            type: {
              array: ["u8", 64];
            };
          },
          {
            name: "recoveryId";
            type: "u8";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "DIDError";
      msg: "An error occurred evaluating the DID";
    },
    {
      code: 6001;
      name: "NotAuthority";
      msg: "The key is not an authority on the DID";
    },
    {
      code: 6002;
      name: "DIDRegistered";
      msg: "The DID is already registered";
    },
    {
      code: 6003;
      name: "DIDNotRegistered";
      msg: "Attempt to remove a DID that is not registered";
    },
    {
      code: 6004;
      name: "InvalidEthSignature";
      msg: "The Eth signature did not sign the message";
    },
    {
      code: 6005;
      name: "WrongEthSigner";
      msg: "The Eth signature was signed by the wrong address";
    }
  ];
};

export const IDL: DidRegistry = {
  version: "0.1.0",
  name: "did_registry",
  instructions: [
    {
      name: "createKeyRegistry",
      docs: ["Create an empty DID registry for a given solana key"],
      accounts: [
        {
          name: "registry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "bump",
          type: "u8",
        },
      ],
    },
    {
      name: "registerDid",
      docs: ["Add a DID to an authority's registry"],
      accounts: [
        {
          name: "registry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
          docs: ["The authority that owns the registry"],
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority.",
          ],
        },
        {
          name: "didAccount",
          isMut: false,
          isSigner: false,
          docs: [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here",
          ],
        },
      ],
      args: [
        {
          name: "didBump",
          type: "u8",
        },
      ],
    },
    {
      name: "removeDid",
      docs: ["Remove a DID from an authority's registry"],
      accounts: [
        {
          name: "registry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: false,
          isSigner: true,
          docs: ["The authority that owns the registry"],
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: ["The DID to remove from the registry"],
        },
      ],
      args: [],
    },
    {
      name: "registerDidForEthAddress",
      docs: [
        "Add a DID to an eth address's registry, if the solana signer is also an authority",
      ],
      accounts: [
        {
          name: "registry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the authority.",
          ],
        },
        {
          name: "didAccount",
          isMut: false,
          isSigner: false,
          docs: [
            "The account containing the DID document",
            "Specifically, the did account is checked to see if it has the authority as a signer",
            "Since it can be a generative DID, we do not use Account<DidAccount> here",
          ],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ethAddress",
          type: {
            array: ["u8", 20],
          },
        },
        {
          name: "didBump",
          type: "u8",
        },
      ],
    },
    {
      name: "registerDidSignedByEthAddress",
      docs: [
        "Add a DID to an eth address's registry, without requiring the solana signer to be an authority on the DID",
      ],
      accounts: [
        {
          name: "registry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "did",
          isMut: false,
          isSigner: false,
          docs: [
            'The DID to add to the registry. This is the did "identifier", not the did account',
            "i.e. did:sol:<identifier>",
            "note - this may or may not be the same as the payer.",
          ],
        },
        {
          name: "didAccount",
          isMut: false,
          isSigner: false,
          docs: [
            "The account containing the DID document",
            "This can safely be a DidAccount, rather than UncheckedAccount,",
            "since, for the DID to include an eth address it must be a non-generative DID.",
          ],
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ethAddress",
          type: {
            array: ["u8", 20],
          },
        },
        {
          name: "ethSignature",
          type: {
            defined: "Secp256k1RawSignature",
          },
        },
        {
          name: "didBump",
          type: "u8",
        },
      ],
    },
  ],
  accounts: [
    {
      name: "keyRegistry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "version",
            type: "u8",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "dids",
            type: {
              vec: "publicKey",
            },
          },
        ],
      },
    },
    {
      name: "controllerRegistry",
      type: {
        kind: "struct",
        fields: [
          {
            name: "version",
            type: "u8",
          },
          {
            name: "did",
            type: "publicKey",
          },
          {
            name: "controlledDids",
            type: {
              vec: "publicKey",
            },
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "Secp256k1RawSignature",
      type: {
        kind: "struct",
        fields: [
          {
            name: "signature",
            type: {
              array: ["u8", 64],
            },
          },
          {
            name: "recoveryId",
            type: "u8",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "DIDError",
      msg: "An error occurred evaluating the DID",
    },
    {
      code: 6001,
      name: "NotAuthority",
      msg: "The key is not an authority on the DID",
    },
    {
      code: 6002,
      name: "DIDRegistered",
      msg: "The DID is already registered",
    },
    {
      code: 6003,
      name: "DIDNotRegistered",
      msg: "Attempt to remove a DID that is not registered",
    },
    {
      code: 6004,
      name: "InvalidEthSignature",
      msg: "The Eth signature did not sign the message",
    },
    {
      code: 6005,
      name: "WrongEthSigner",
      msg: "The Eth signature was signed by the wrong address",
    },
  ],
};
