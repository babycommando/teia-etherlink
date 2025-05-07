"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Head from "next/head";

/* ─── Addresses (env vars) ─────────────────────────────────── */
const TEIA1155 = process.env.NEXT_PUBLIC_TEIA1155_ADDRESS!;
const MARKET = process.env.NEXT_PUBLIC_TEIA_MARKETPLACE_ADDRESS!;

/* ─── Minimal ABIs ─────────────────────────────────────────── */
/* Teia1155: mint + setApprovalForAll + balanceOf */
const teiaAbi = [
  {
    name: "mint",
    inputs: [
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes" },
      { type: "uint96" },
      { type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "setApprovalForAll",
    inputs: [{ type: "address" }, { type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "isApprovedForAll",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "balanceOf",
    inputs: [{ type: "address" }, { type: "uint256" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "uri",
    inputs: [{ type: "uint256" }],
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

/* Marketplace: mintEdition, createSwap, collect, cancelSwap,     */
/*              public getters (counter → next id, swaps(id) …)  */
const mpAbi = [
  {
    name: "mintEdition",
    inputs: [
      { type: "uint256" },
      { type: "uint256" },
      { type: "string" },
      { type: "uint16" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "createSwap",
    inputs: [
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint16" },
      { type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "collect",
    inputs: [{ type: "uint256" }, { type: "uint256" }],
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    name: "cancelSwap",
    inputs: [{ type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    name: "counter",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "swaps",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "issuer", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "royalty", type: "uint16" },
      { name: "creator", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export default function ArtistConsole() {
  /* ───── React state ───── */
  const [signer, setSigner] = useState<ethers.Signer>();
  const [addr, setAddr] = useState("");
  const [tokenId, setTokenId] = useState("1");
  const [amount, setAmount] = useState("10");
  const [uri, setUri] = useState(
    "ipfs://QmYxTgsEi1yM7Vaia3YoEAN3mshor8ZT9e9vHSPMvWgBpn"
  );
  const [price, setPrice] = useState("0.01"); // ETH
  const [swaps, setSwaps] = useState<any[]>([]);

  console.log(swaps);
  // console.log(JSON.stringify(swaps));

  /* ───── Status States ───── */
  const [connectStatus, setConnectStatus] = useState("Not started");
  const [mintStatus, setMintStatus] = useState("Not started");
  const [approveStatus, setApproveStatus] = useState("Not started");
  const [swapStatus, setSwapStatus] = useState("Not started");
  const [buyStatus, setBuyStatus] = useState("Not started");
  const [cancelStatus, setCancelStatus] = useState("Not started");

  /* ───── Provider + contracts helpers ───── */
  const teia = signer ? new ethers.Contract(TEIA1155, teiaAbi, signer) : null;
  const mp = signer ? new ethers.Contract(MARKET, mpAbi, signer) : null;

  async function connect() {
    if (!window.ethereum) {
      alert("Install MetaMask");
      return;
    }

    setConnectStatus("Loading…");

    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send("eth_requestAccounts", []);
      const s = await prov.getSigner();
      setSigner(s);
      setAddr(await s.getAddress());
      setConnectStatus("Success");
      fetchSwaps(s);
    } catch (e: any) {
      setConnectStatus(`Error: ${e.message}`);
    }
  }

  /* ───── Mint editions to artist wallet ───── */
  async function mint() {
    if (!teia || !mp) return;
    setMintStatus("Loading…");

    try {
      const tx = await mp.mintEdition(
        BigInt(tokenId),
        BigInt(amount),
        uri,
        250 // 2.5 % royalty
      );
      await tx.wait();
      setMintStatus("Success");
      fetchSwaps();
    } catch (e: any) {
      setMintStatus(`Error: ${e.message}`);
    }
  }

  /* ───── Approve marketplace once ───── */
  async function approveMarket() {
    if (!teia) return;
    setApproveStatus("Loading…");

    try {
      const tx = await teia.setApprovalForAll(MARKET, true);
      await tx.wait();
      setApproveStatus("Success");
    } catch (e: any) {
      setApproveStatus(`Error: ${e.message}`);
    }
  }

  /* ───── List some editions for sale ───── */
  async function createSwap() {
    if (!mp) return;
    setSwapStatus("Loading…");

    try {
      const wei = ethers.parseEther(price);
      const tx = await mp.createSwap(
        BigInt(tokenId),
        BigInt(amount),
        wei,
        250, // copy the same royalty
        addr // creator = artist
      );
      await tx.wait();
      setSwapStatus("Success");
      fetchSwaps();
    } catch (e: any) {
      setSwapStatus(`Error: ${e.message}`);
    }
  }

  const READ_ONLY_PROVIDER = new ethers.JsonRpcProvider(
    "https://node.ghostnet.etherlink.com"
  );

  /* ───── Refresh on‑chain swap list (basic) ───── */
  async function fetchSwaps(
    signerOrProvider?: ethers.Signer | ethers.Provider
  ) {
    const provider = signerOrProvider || READ_ONLY_PROVIDER;
    const teia = new ethers.Contract(TEIA1155, teiaAbi, provider);
    const mp = new ethers.Contract(MARKET, mpAbi, provider);

    const next = Number(await mp.counter());
    const tmp = [];

    for (let i = 0; i < next; i++) {
      const t = await mp.swaps(i);
      const amount = Number(t[2]);
      if (amount === 0) continue;

      const tokenId = Number(t[1]);
      let uri = "";
      let metadata = {};

      try {
        uri = await teia.uri(tokenId);

        if (uri.startsWith("ipfs://")) {
          const ipfsHash = uri.replace("ipfs://", "");
          const jsonUri = `https://ipfs.io/ipfs/${ipfsHash}`;

          const response = await fetch(jsonUri);
          if (response.ok) {
            metadata = await response.json();
          }
        }
      } catch (err) {
        console.warn(
          `Error fetching URI or metadata for tokenId ${tokenId}:`,
          err
        );
      }

      tmp.push({
        id: i,
        issuer: t[0],
        tokenId,
        amount,
        priceWei: t[3],
        royalty: Number(t[4]),
        creator: t[5],
        uri,
        metadata,
      });
    }

    setSwaps(tmp);
  }

  /* ───── Buy 1 edition from a swap ───── */
  async function buy(swapId: number, pricePer: bigint) {
    if (!mp) return;
    setBuyStatus("Loading…");

    try {
      const tx = await mp.collect(swapId, 1, { value: pricePer });
      await tx.wait();
      setBuyStatus("Success");
      fetchSwaps();
    } catch (e: any) {
      setBuyStatus(`Error: ${e.message}`);
    }
  }

  /* ───── Cancel swap ───── */
  async function cancel(swapId: number) {
    if (!mp) return;
    setCancelStatus("Loading…");

    try {
      const tx = await mp.cancelSwap(swapId);
      await tx.wait();
      setCancelStatus("Success");
      fetchSwaps();
    } catch (e: any) {
      setCancelStatus(`Error: ${e.message}`);
    }
  }

  useEffect(() => {
    fetchSwaps();
  }, []);

  /* ───── UI ───── */
  return (
    <>
      <Head>
        <title>Teia @ Etherlink</title>
        <meta
          name="description"
          content="Tests for integration of the Teia NFT marketplace smart contracts in solidity."
        />
      </Head>
      <main className=" bg-black ">
        <div>
          <div className="flex items-center justify-center l">
            <Card className="w-[420px] p-6 bg-[#1e1e1e] text-white border-neutral-700 mb-4 mt-4">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center mr-5">
                  <svg
                    fill="#e4e4e4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1000 283.5"
                    width="132px">
                    <path d="M363.2 0H199.3v66.4H248v217.1h70.9V66.4H372V0h-4.4zm225.9 0h-176v282.2h184.8V217H479.1v-31h118.8V0h-8.8zm-57.6 70.9V115h-52.8V66.6h52.8v4.3zM699.8 0h-62v66.4h70.9V0h-4.5zm230.3 0H748.6v66.4h118.8v31H748.6v184.8h184.8V0h-3.3zm-62 172.7v44H815v-48.3h52.8v4.3zM699.8 97.4h-62v186.1h70.9V97.4h-4.5z"></path>
                  </svg>
                  <p className="mr-2">@</p>
                  <img
                    src="https://faucet.etherlink.com/etherlink-logo.svg"
                    className="w-38"
                  />
                </div>
                {/* <h1 className="text-xl font-bold">Pre-Alpha</h1> */}
              </CardHeader>
              <CardContent className="space-y-4">
                <b className="mb-2">0. Fill Testnet Wallet at the Faucet</b>
                <p className="text-sm text-neutral-300">
                  To get started, connect and fill in your wallet with Etherlink
                  Testnet XTZ on{" "}
                  <a
                    className="text-green-400"
                    href="https://faucet.etherlink.com/">
                    https://faucet.etherlink.com/
                  </a>
                </p>

                <p className="text-sm text-neutral-300">
                  Then connect your wallet:
                </p>
                {!signer ? (
                  <Button
                    onClick={connect}
                    className="w-full bg-green-500 hover:bg-green-600 cursor-pointer">
                    <img
                      className="w-5"
                      src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                    />
                    Connect Wallet
                  </Button>
                ) : (
                  <>
                    <div className="bg-neutral-700 p-2 rounded-md">
                      <div className="flex gap-2 items-center mb-1">
                        <img
                          className="w-5"
                          src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                        />
                        <p className="text-left">Connected Wallet:</p>
                      </div>
                      <p className="text-left text-xs text-amber-100">{addr}</p>
                    </div>
                  </>
                )}
                <p className="text-sm text-neutral-400 mt-2">
                  Wallet status: {connectStatus}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center l mb-4">
            <Card className="w-[420px] p-6 bg-[#1e1e1e] text-white border-neutral-700">
              <CardContent>
                <b className="mb-2 mt-3">1. Mint Tokens</b>
                <p className="mb-1 mt-2 text-xs font-bold">Token ID</p>
                <Input
                  placeholder="Token ID"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  className="bg-black border-neutral-700 mb-4"
                />

                <p className="mb-1 mt-2 text-xs font-bold">Amount</p>
                <Input
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-black border-neutral-700 mb-4"
                />

                <p className="mb-1 mt-2 text-xs font-bold">IPFS URI</p>
                <p className="mb-1 mt-1 text-xs">
                  The Json file containing the NFT data
                </p>
                <Input
                  placeholder="IPFS URI"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  className="bg-black border-neutral-700 mb-4"
                />
                <Button
                  onClick={mint}
                  className="w-full gap-1 bg-green-500 hover:bg-green-400 cursor-pointer">
                  Mint on
                  <img
                    src="https://faucet.etherlink.com/etherlink-logo.svg"
                    className="w-20"
                  />
                </Button>
                <p className="text-sm text-neutral-400 mt-2">
                  Mint Status: {mintStatus}
                </p>
                <p className="text-sm text-neutral-200 mt-2">
                  After minted, you can check the tokens in your metamask wallet
                  at the "NFTs" tab.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center l mb-4">
            <Card className="w-[420px] p-6 bg-[#1e1e1e] text-white border-neutral-700">
              <CardContent>
                {/* Approval */}
                <section className="space-y-2">
                  <h2 className="font-semibold mb-1">2. Approve Marketplace</h2>
                  <p className="text-sm text-neutral-300 mb-4">
                    This approves the marketplace contract to hold the tokens
                    and its done only once, ever.
                  </p>
                  <Button
                    onClick={approveMarket}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 cursor-pointer">
                    Call setApprovalForAll()
                  </Button>
                  <p className="text-sm text-neutral-400 mt-2">
                    Approve Status: {approveStatus}
                  </p>
                </section>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center l mb-4">
            <Card className="w-[420px] p-6 bg-[#1e1e1e] text-white border-neutral-700">
              <CardContent>
                <b className="mb-2 mt-3">3. Swap Minted Tokens</b>
                <p className="text-sm text-neutral-300 mb-4">
                  This sends the tokens to the contract to operate in your name
                  for a certain price.
                </p>

                <p className="mb-1 mt-1 text-xs font-bold">
                  Price (Etherlink XTZ)
                </p>
                <Input
                  placeholder="Price (ETH)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="bg-black border-neutral-700 mb-4"
                />
                <Button
                  onClick={createSwap}
                  className="w-full bg-purple-600 hover:bg-purple-700 cursor-pointer">
                  Create Swap
                </Button>
                <p className="text-sm text-neutral-400 mt-2">
                  Swap Status: {swapStatus}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-center l">
            <Card className="w-[420px] p-6 bg-[#1e1e1e] text-white border-neutral-700 mb-4">
              <CardContent>
                {/* Swaps list */}
                <section className="border-0">
                  {/* Approval */}
                  <h2 className="font-semibold">
                    4. Collect or Cancel Open Swaps
                  </h2>
                  <p className="mb-1 mt-1 text-xs">
                    If you are the minter you can see the "cancel swap" button
                    as well.
                  </p>
                  {swaps.length === 0 && <p>No active swaps.</p>}
                  {swaps.map((s) => (
                    <div
                      key={s.id}
                      className="border-1 border-neutral-700 rounded-md p-2 my-2">
                      <div className="flex gap-4 mb-4">
                        <div className="w-16 h-16 bg-neutral-200">
                          {s.metadata.artifactUri ? (
                            <img
                              src={s.metadata.artifactUri.replace(
                                "ipfs://",
                                "https://ipfs.io/ipfs/"
                              )}
                              className="w-full h-full object-cover"
                              alt={s.metadata.name || "NFT Image"}
                            />
                          ) : (
                            <div className="text-xs text-gray-500">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="text-white">
                          <p className="text-sm">Swap #{s.id}</p>
                          <p className="text-sm">Token ID: {s.tokenId}</p>
                          <p className="text-sm">Left: {s.amount}</p>
                          <p className="text-sm">
                            Price: {ethers.formatEther(s.priceWei)} XTZ
                          </p>
                          <p className="text-sm">
                            Name: {s.metadata.name || "N/A"}
                          </p>
                          {/* <p className="text-sm">
                            Description: {s.metadata.description || "N/A"}
                          </p> */}
                        </div>
                      </div>
                      <div className="space-x-2 flex items-center">
                        <Button
                          onClick={() => buy(s.id, s.priceWei)}
                          className=" text-xs bg-green-500 h-6 hover:bg-green-400 rounded">
                          Buy 1 for {ethers.formatEther(s.priceWei)} XTZ
                        </Button>
                        {s.issuer.toLowerCase() === addr.toLowerCase() && (
                          <Button
                            onClick={() => cancel(s.id)}
                            className="w-16 h-6 bg-red-600 hover:bg-red-500 px-2 py-1 rounded">
                            Cancel
                          </Button>
                        )}
                      </div>

                      <p className="text-sm text-neutral-400 mt-2">
                        Buy Status: {buyStatus}
                      </p>

                      {s.issuer.toLowerCase() === addr.toLowerCase() && (
                        <p className="text-sm text-neutral-400 mt-2">
                          Cancel Status: {cancelStatus}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
