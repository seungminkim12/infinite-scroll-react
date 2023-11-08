import BigNumber from "bignumber.js";
import AnimatedBigNumber from "components/custom/AnimatedBigNumber";
import useUpdate from "view/hooks/UseUpdate";
import { useMemo, useState } from "react";
import { requestGet, requestPost } from "static/js/Request";
import useAddress from "components/custom/UseAddress";
import { toast } from "react-hot-toast";
import uprompt from "components/custom/UsePrompt";

import Switch from "view/componentLibrary/Switch";

import { format, formatCapitalLabel } from "view/utils/util";
import AnimatedBigNumbers from "components/custom/AnimatedBigNumbers";
import { NodeContainer } from "components/fragments/Node";
import BasicButton, { ButtonType } from "view/components/BasicButton";
import { staking } from "store/enmc";
import { useSelector } from "react-redux";

// StakeControl
const currencyFactor = new BigNumber(10).exponentiatedBy(18);
const StakeControl = () => {
  const stakingAmount = useSelector(staking);
  const [totalStaking, setTotalStaking] = useState("0");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("stake");
  const ipAddress = useAddress();

  const stakingRate = useMemo(() => {
    return new BigNumber(stakingAmount).div(totalStaking);
  }, [stakingAmount, totalStaking]);

  useUpdate(() => {
    requestGet(ipAddress, "/node/total-staking", null, (resp) => {
      setTotalStaking(resp);
    });
  }, 1000);

  const stake = async () => {
    const rawValue = await uprompt("Please enter the amount to stake.");
    if (rawValue === null) return;

    const value = new BigNumber(rawValue);
    if (value.isNaN()) {
      toast.error("Input data is invalid.");
      return;
    } else if (!value.isPositive()) {
      toast.error("Staking amount should be positive number.");
      return;
    } else {
      requestPost(
        ipAddress,
        "/transaction/stake",
        {
          amount: "0x" + value.multipliedBy(currencyFactor).toString(16),
        },
        (resp) => {
          console.log(resp);
        }
      );
    }
  };

  const unstake = async () => {
    const rawValue = await uprompt("Please enter the amount to unstake.");
    if (rawValue === null) return;

    const value = new BigNumber(rawValue);
    if (value.isNaN()) {
      toast.error("Input data is invalid.");
      return;
    } else if (!value.isPositive()) {
      toast.error("Unstaking amount should be positive number.");
      return;
    } else {
      requestPost(
        ipAddress,
        "/transaction/unstake",
        {
          amount: "0x" + value.multipliedBy(currencyFactor).toString(16),
        },
        (resp) => {
          console.log(resp);
        }
      );
    }
  };

  return (
    <div className="stake-control">
      <div className="std-label">Staked Amount</div>
      <div className="stake-amount-wrapper">
        <div className="staked-amount">
          {AnimatedBigNumber({
            value: stakingAmount,
            precision: 18,
            useEth: true,
            ASR: 0.4,
          })}
        </div>
        <div className="controllers">
          <BasicButton type={ButtonType.Secondary} style={{ marginRight: 15 }} onClick={unstake}>
            Unstake
          </BasicButton>
          <BasicButton onClick={stake}>Stake</BasicButton>
        </div>
      </div>
      <div className="staking-rate">Power Rate: {new BigNumber(stakingRate).multipliedBy(100).toFormat(3)}%</div>
    </div>
  );
};

// MinerStatus
const STATUS = {
  IDLE: "IDLE",
  READY: "Ready",
  MINING: "Equalizing",
};
const minerActiveness = (status) => {
  return {
    IDLE: "inactive",
    Ready: "mediate",
    Equalizing: "active",
  }[status];
};
const MinerStatus = ({ serviceInfo }) => {
  const [status, setStatus] = useState(STATUS.IDLE);
  const activeness = useMemo(() => {
    return minerActiveness(status);
  }, [status]);
  const ipAddress = useAddress();

  useUpdate(() => {
    requestGet(ipAddress, "/miner/status", null, (resp) => {
      const { mining, ready } = resp;
      if (mining === true) {
        setStatus(STATUS.MINING);
      } else if (ready === true) {
        setStatus(STATUS.READY);
      } else {
        setStatus(STATUS.IDLE);
      }
    });
  }, 1000);

  const minerToggler = async (requestStatus) => {
    if (requestStatus === false) {
      // stop mine
      requestPost(
        ipAddress,
        "/miner/stop-mining",
        null,
        (resp) => {
          console.log(resp);
        },
        (err) => {
          console.error(err);
        },
        false
      );
    } else {
      const password = await uprompt("Please enter the password to start mining.", true);
      // start mine
      requestPost(
        ipAddress,
        "/miner/start-mining",
        {
          password,
        },
        (resp) => {
          console.log(resp);
        },
        (err) => {
          const statusCode = err?.response?.status;
          switch (statusCode) {
            case 409:
              toast.error("The password is incorrect.");
              break;
            default:
              toast.error(`unknown error: ${statusCode}`);
              break;
          }

          console.error(err);
        },
        false
      );
    }
  };

  return (
    <div className="miner-status">
      <div className="miner-status-title">Consensus</div>
      <div className="miner-status-body">
        <div className="miner-status-card">
          <div className="miner-status-card-title-wrapper">
            <div className="miner-status-card-title">Status</div>
            <div className="miner-status-card-sub">{status}</div>
          </div>
          <Switch defaultChecked={false} scale={0.9} checked={status === STATUS.MINING} toggleEventHandler={minerToggler} />
        </div>
      </div>
      {/* <div className={"instance box " + (activeness ?? "")}>
        <div className="header">
          <div className="icon">
            <SiWebpack />
          </div>
          <div className="name">Consensus</div>
        </div>
        <div className="body">
          <div className="uptime">{status}</div>
        </div>
      </div> */}
    </div>
  );
};

// ChainDetail
const ChainDetail = () => {
  const ipAddress = useAddress();
  const stakingAmount = useSelector(staking);

  const [height, setHeight] = useState(0);
  const [balance, setBalance] = useState("0");
  const [totalSupply, setTotalSupply] = useState("0");
  const [expectedReward, setExpectedReward] = useState("0");

  const role = useMemo(() => {
    if (height === 0) {
      return "unknown";
    }
    return new BigNumber(stakingAmount).comparedTo(0) === 1 ? "equalizer" : "light";
  }, [stakingAmount, height]);

  useUpdate(() => {
    requestGet(ipAddress, "/node/equalize-status", null, (resp) => {
      const { height, round } = resp;
      setHeight(height);
    });

    requestGet(ipAddress, "/node/balance", null, (resp) => {
      setBalance(resp);
    });

    requestGet(ipAddress, "/node/total-supply", null, (resp) => {
      setTotalSupply(resp);
    });

    requestGet(ipAddress, "/miner/expected-reward", null, (resp) => {
      setExpectedReward(resp);
    });
  }, 1000);

  const [balanceB, expectedRewardB, totalSupplyB] = AnimatedBigNumbers({
    values: [balance, expectedReward, totalSupply],
    useEth: true,
    ASR: 0.4,
    precision: 18,
  });

  return (
    <NodeContainer title={"info"}>
      <div className="node-container-box-wrapper">
        <div className="node-container-box">
          <div className="node-container-box-left">
            <span className="node-container-box-title">Role</span>
            <span className="node-container-box-value">{formatCapitalLabel(role)}</span>
          </div>
        </div>
        <div className="node-container-box">
          <div className="node-container-box-left">
            <span className="node-container-box-title">Blocks</span>
            <span className="node-container-box-value">{format(height ?? "0")}</span>
          </div>
        </div>
        <div className="node-container-box">
          <div className="node-container-box-left">
            <span className="node-container-box-title">Balance</span>
            <span className="node-container-box-value">{balanceB}</span>
          </div>
        </div>
        <div className="node-container-box">
          <div className="node-container-box-left">
            <span className="node-container-box-title">Expected Reward</span>
            <span className="node-container-box-value">+{expectedRewardB}</span>
          </div>
        </div>
        <div className="node-container-box">
          <div className="node-container-box-left">
            <span className="node-container-box-title">Total Supplied</span>
            <span className="node-container-box-value">{totalSupplyB}</span>
          </div>
        </div>
      </div>
    </NodeContainer>
    // <div className="chain-detail box">
    //   <div className="detail">
    //     <div className="header"></div>
    //     <div className="body">
    //       <div className="label">Balance</div>
    //       <div className="value">{balanceB}</div>
    //     </div>
    //   </div>
    //   <div className="detail">
    //     <div className="header"></div>
    //     <div className="body">
    //       <div className="label">Expected Reward</div>
    //       <div className="value reward">+{expectedRewardB}</div>
    //     </div>
    //   </div>
    //   <div className="detail">
    //     <div className="header"></div>
    //     <div className="body">
    //       <div className="label">Total Supplied</div>
    //       <div className="value">{totalSupplyB}</div>
    //     </div>
    //   </div>
    // </div>
  );
};

// Chain
const ENMC_SERVER_ADDRESS = process.env.REACT_APP_ENMC_SERVER_ADDRESS;
const ENMC_SERVER_PORT = process.env.REACT_APP_ENMC_SERVER_PORT;

const Chain = () => {
  return (
    <div className="content">
      <StakeControl />
      <div className="miner-wrapper">
        <div className="flex-1">
          <MinerStatus />
        </div>
        <div className="flex-1">
          <ChainDetail />
        </div>
      </div>
    </div>
  );
};
export default Chain;