// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CondominiumModule = buildModule("CondominiumModule", (m) => {
  const condominium = m.contract("Condominium")

  const adapter = m.contract("CondominiumAdapter", [], {
    after: [condominium],
  });

  m.call(adapter, "upgrade", [condominium]);

  return { condominium, adapter };
});

export default CondominiumModule;
