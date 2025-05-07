"use client";

import { useState } from "react";
import { ethers } from "ethers";

// ─── deployed addresses ───────────────────────────────────────
const teia1155Address = process.env.NEXT_PUBLIC_TEIA1155_ADDRESS!;
const marketplaceAddress = process.env.NEXT_PUBLIC_TEIA_MARKETPLACE_ADDRESS!;

// ─── minimal Teia1155 ABI (only what we call) ─────────────────
const teia1155ABI = [
  {
    name: "MINTER_ROLE",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "grantRole",
    inputs: [{ type: "bytes32" }, { type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "hasRole",
    inputs: [{ type: "bytes32" }, { type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "DEFAULT_ADMIN_ROLE",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
];

// ─── (optional) manager getter if you kept addToken() ─────────
// const marketplaceABI = [
//   { name: "manager",  inputs: [], outputs: [{type:"address"}], stateMutability:"view", type:"function" },
//   { name: "addToken", inputs:[{type:"address"}], outputs:[],   stateMutability:"nonpayable", type:"function" }
// ];

export default function GrantMinterRole() {
  const [account, setAccount] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  /* ───────── wallet connect ───────── */
  async function getSigner() {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return null;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
    return signer;
  }

  /* ───────── grant MINTER_ROLE to marketplace ───────── */
  async function grantRoleToMarketplace() {
    const signer = await getSigner();
    if (!signer) return;

    setLoading(true);
    setStatus("Granting MINTER_ROLE to marketplace…");

    try {
      const token = new ethers.Contract(teia1155Address, teia1155ABI, signer);
      const admin = await token.DEFAULT_ADMIN_ROLE();
      const me = await signer.getAddress();
      const isAdmin = await token.hasRole(admin, me);

      if (!isAdmin) {
        setStatus("Connected wallet is NOT Teia1155 admin.");
        setLoading(false);
        return;
      }
      const ROLE = await token.MINTER_ROLE();
      const tx = await token.grantRole(ROLE, marketplaceAddress);
      await tx.wait();

      setStatus("✅ MINTER_ROLE granted to marketplace.");
    } catch (err: any) {
      console.error(err);
      setStatus("Grant failed: " + (err.info?.error?.message ?? err.message));
    }
    setLoading(false);
  }

  return (
    <div className="p-6 text-white bg-black h-screen">
      <h1 className="text-2xl font-bold mb-4">Teia setup (one‑time)</h1>

      {!account ? (
        <button onClick={getSigner} className="bg-blue-600 px-4 py-2 rounded">
          Connect wallet
        </button>
      ) : (
        <p className="mb-4">Connected as: {account}</p>
      )}

      <button
        onClick={grantRoleToMarketplace}
        disabled={loading}
        className="bg-purple-600 px-4 py-2 rounded">
        {loading ? "Granting…" : "Grant MINTER_ROLE to Marketplace"}
      </button>

      {/* ─── uncomment if you kept multi‑collection addToken() ───
      <button
        onClick={whitelistToken}
        disabled={loading}
        className="bg-yellow-600 px-4 py-2 rounded mt-4">
        {loading ? "Whitelisting…" : "Whitelist Teia1155"}
      </button>
      */}

      <p className="mt-4">{status}</p>
    </div>
  );
}
