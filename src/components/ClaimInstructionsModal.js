import { Dialog } from "primereact/dialog";
import Image from "next/image";
import Link from "next/link";
import strike0 from "../../public/strike0.PNG";
import strike1 from "../../public/strike1.PNG";
import strike2 from "../../public/strike2.PNG";
import strike3 from "../../public/strike3.PNG";

const LN_ADDRESS_PROVIDERS = [
  {
    name: "Strike",
    logo: "https://logowik.com/content/uploads/images/strike8819.logowik.com.webp",
    link: "https://strike.me",
  },
  {
    name: "Stacker News",
    logo: "https://www.nobsbitcoin.com/content/images/2023/05/stackernews-logo.png",
    link: "https://stacker.news/",
  },
  {
    name: "Primal",
    logo: "https://www.techcompanynews.com/wp-content/uploads/2023/07/Primal-power.png",
    link: "https://primal.net/",
  },
  {
    name: "Alby",
    logo: "https://blog.getalby.com/content/images/2022/05/aa-6.jpg",
    link: "https://getalby.com/",
  },
  {
    name: "ZBD",
    logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_wSvnll3qn0xY8YOpvBUeqCDWNkS8xZIdLFDM-EYHQDogxlNLhhxAWw8PEUoIpirXnGI&usqp=CAU",
    link: "https://zbd.gg/",
  },
  {
    name: "Mutiny Pro",
    logo: "https://www.nobsbitcoin.com/content/images/2023/07/mutiny-wallet3.png",
    link: "https://www.mutinywallet.com/",
  },
];

export function ClaimInstructionsModal({ isVisible, onHide }) {
  return (
    <Dialog
      header="How to Claim Rewards"
      visible={isVisible}
      modal
      onHide={onHide}
      style={{ scrollbarWidth: "none" }}
      className="h-full w-full"
    >
      <div
        className={"rounded-lg flex flex-col h-full"}
        style={{ scrollbarWidth: "none" }}
      >
        <p>Claim Rewards Using A Lightning Address:</p>
        <ul className="list-decimal flex flex-col gap-y-2">
          <li>
            You will need to obtain a Lightning Address. You can obtain a
            Lightning Address by using any of the following services:
            <div
              className={"flex flex-col md:flex-row gap-6 md:flex-wrap my-4"}
            >
              {LN_ADDRESS_PROVIDERS.map((provider, _) => (
                <Link
                  key={_}
                  href={provider.link}
                  className={
                    "w-full md:w-96 h-64 bg-black flex flex-col items-center p-2 no-underline"
                  }
                >
                  <img
                    src={provider.logo}
                    alt={provider.name}
                    className={"w-full h-4/5 object-contain"}
                  />
                  <div className={"flex flex-1 items-center"}>
                    <p>{provider.name}</p>
                  </div>
                </Link>
              ))}
            </div>
          </li>
          <li>
            After creating an account using one of the services in the previous
            step, you will need to locate your Lightning Address. This should
            have been automatically created for you. It will look similar to an
            email address and it will generally be structured as your username
            followed by the @ symbol, and the app name. <i>ex: username@strike.me</i>
          </li>
          <div
            className={
              "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
            }
          >
            <Image
              src={strike0}
              className={"h-[600px] w-auto object-contain"}
            />
            <Image
              src={strike1}
              className={"h-[600px] w-auto object-contain"}
            />
            <Image
              src={strike2}
              className={"h-[600px] w-auto object-contain"}
            />
          </div>
          <li>
            Copy and paste your Lightning Address into the input box and press
            the claim button after verifying that you have entered your
            Lightning Address correctly.
          </li>
          <div
            className={
              "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
            }
          >
            <Image
              src={strike3}
              className={"h-[600px] w-auto object-contain"}
            />
          </div>
        </ul>
        <p>Claim Rewards Using A Bolt11 Invoice:</p>
        <ul className="list-decimal flex flex-col gap-y-2">
          <li>
            Open your preferred lightning wallet. (any of the services in the
            instructions for claiming rewards using a Lightning Address will
            also work)
          </li>
          <li>
            Using a lightning wallet, you can create an amountless invoice or
            set the amount equal to that of the amount of your claimable reward.
          </li>
          <li>
            Copy and paste your Bolt11 Invoice into the input box and press the
            claim button after verifying that you have entered your Bolt11
            Invoice correctly.
          </li>
        </ul>
      </div>
    </Dialog>
  );
}
