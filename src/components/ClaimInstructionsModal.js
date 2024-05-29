import { Dialog } from "primereact/dialog";
import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import strike0 from "../../public/strike0.PNG";
import strike1 from "../../public/strike1.PNG";
import strike2 from "../../public/strike2.PNG";
import strike3 from "../../public/strike3.PNG";
import alby0 from "../../public/alby0.png";
import alby1 from "../../public/alby1.png";
import alby2 from "../../public/alby2.png";
import alby3 from "../../public/alby3.png";
import alby4 from "../../public/alby4.png";
import mutiny from "../../public/mutinypro.png";
import strike from "../../public/strike.png";
import stackernews from "../../public/stackernews.png";
import primal from "../../public/primal.png";
import alby from "../../public/alby.png";
import zbd from "../../public/zbd.png";
import { ImagePreview } from "./ImagePreview";

import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { Button } from "primereact/button";

const LN_ADDRESS_PROVIDERS = [
  {
    name: "Strike",
    logo: strike,
    link: "https://strike.me",
  },
  {
    name: "Stacker News",
    logo: stackernews,
    link: "https://stacker.news/",
  },
  {
    name: "Primal",
    logo: primal,
    link: "https://primal.net/",
  },
  {
    name: "Alby",
    logo: alby,
    link: "https://getalby.com/",
  },
  {
    name: "ZBD",
    logo: zbd,
    link: "https://zbd.gg/",
  },
  {
    name: "Mutiny Pro",
    logo: mutiny,
    link: "https://www.mutinywallet.com/",
  },
];

export function ClaimInstructionsModal({ isVisible, onHide }) {
  const stepperRef = useRef(null);
  const stepperRef2 = useRef(null);
  const stepperVerticalRef = useRef(null);
  const stepperVerticalRef2 = useRef(null);

  return (
    <Dialog
      header={
        <div className={"text-center md:text-6xl text-4xl font-bold p-2"}>
          How to Claim Rewards
        </div>
      }
      visible={isVisible}
      modal
      onHide={onHide}
      maximizable
      style={{ scrollbarWidth: "none", width: "100vw" }}
    >
      <div className={"rounded-lg flex flex-col h-full"}>
        <div className={"hidden sm:block"}>
          <p className={"text-2xl ml-4 font-bold"}>
            Claim Rewards Using A Lightning Address:
          </p>
          <Stepper ref={stepperRef} style={{ flexBasis: "50rem" }}>
            <StepperPanel header="Get a Lightning Wallet">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  You will need to obtain a Lightning Address. You can obtain a
                  Lightning Address by using any of the following services:
                  <div className={"flex flex-row gap-8 flex-wrap my-4"}>
                    {LN_ADDRESS_PROVIDERS.map((provider, _) => (
                      <Link
                        key={_}
                        href={provider.link}
                        className={
                          "w-64 h-48 flex flex-col items-center p-2 no-underline border-solid border-2 border-gray-200 rounded-lg bg-black"
                        }
                      >
                        <Image
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
              </div>
              <div className="flex pt-4 justify-end">
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperRef.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Find your Lightning Address">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  After creating an account using one of the services in the
                  previous step, you will need to locate your Lightning Address.
                  This should have been automatically created for you. It will
                  look similar to an email address and it will generally be
                  structured as your username followed by the @ symbol, and the
                  app name. <i>(example below: Strike IOS app)</i>
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={strike0}
                    alt={"strike0"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={strike1}
                    alt={"strike1"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={strike2}
                    alt={"strike2"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-between">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperRef.current.prevCallback()}
                />
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperRef.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Claim your Reward">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  Copy and paste your Lightning Address into the input box and
                  press the claim button after verifying that you have entered
                  your Lightning Address correctly.
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={strike3}
                    alt={"strike3"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-start">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperRef.current.prevCallback()}
                />
              </div>
            </StepperPanel>
          </Stepper>
          <p className={"text-2xl ml-4 font-bold"}>
            Claim Rewards Using A Bolt11 Invoice:
          </p>
          <Stepper ref={stepperRef2} style={{ flexBasis: "50rem" }}>
            <StepperPanel header="Get a Lightning Wallet">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  You will need to use a lightning wallet. You can download or
                  use a lightning wallet in your browser by using any of the
                  following services:
                  <div className={"flex flex-row gap-8 flex-wrap my-4"}>
                    {LN_ADDRESS_PROVIDERS.map((provider, _) => (
                      <Link
                        key={_}
                        href={provider.link}
                        className={
                          "w-64 h-48 flex flex-col items-center p-2 no-underline border-solid border-2 border-gray-200 rounded-lg bg-black"
                        }
                      >
                        <Image
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
              </div>
              <div className="flex pt-4 justify-end">
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperRef2.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Create a Bolt11 Invoice">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  Using a lightning wallet, create an invoice and set the amount
                  equal to that of the amount of your claimable reward.{" "}
                  <i>(example below: Alby browser extension)</i>
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={alby0}
                    alt={"alby0"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby1}
                    alt={"alby1"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby2}
                    alt={"alby2"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-between">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperRef2.current.prevCallback()}
                />
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperRef2.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Claim your Reward">
              <div className="flex flex-col">
                <li className={"text-xl"}>
                  Copy and paste your Bolt11 Invoice into the input box and
                  press the claim button after verifying that you have entered
                  your Bolt11 Invoice correctly.
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={alby3}
                    alt={"alby3"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby4}
                    alt={"alby4"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-start">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperRef2.current.prevCallback()}
                />
              </div>
            </StepperPanel>
          </Stepper>
        </div>
        <div className={"sm:hidden"}>
          <p className={"text-2xl ml-4 font-bold"}>
            Claim Rewards Using A Lightning Address:
          </p>
          <Stepper
            ref={stepperVerticalRef}
            style={{ flexBasis: "50rem" }}
            orientation="vertical"
          >
            <StepperPanel header="Get a Lightning Wallet">
              <div className="flex flex-col">
                <li>
                  You will need to obtain a Lightning Address. You can obtain a
                  Lightning Address by using any of the following services:
                  <div className={"flex flex-row gap-1 flex-wrap my-4"}>
                    {LN_ADDRESS_PROVIDERS.map((provider, _) => (
                      <Link
                        key={_}
                        href={provider.link}
                        className={
                          "w-[48%] md:w-64 h-48 bg-black flex flex-col items-center p-2 no-underline"
                        }
                      >
                        <Image
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
              </div>
              <div className="flex pt-4 justify-end">
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperVerticalRef.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Find your Lightning Address">
              <div className="flex flex-col">
                <li>
                  After creating an account using one of the services in the
                  previous step, you will need to locate your Lightning Address.
                  This should have been automatically created for you. It will
                  look similar to an email address and it will generally be
                  structured as your username followed by the @ symbol, and the
                  app name. <i>ex: username@strike.me</i>
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={strike0}
                    alt={"strike0"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={strike1}
                    alt={"strike1"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={strike2}
                    alt={"strike2"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-between">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperVerticalRef.current.prevCallback()}
                />
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperVerticalRef.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Claim your Reward">
              <div className="flex flex-col">
                <li>
                  Copy and paste your Lightning Address into the input box and
                  press the claim button after verifying that you have entered
                  your Lightning Address correctly.
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={strike3}
                    alt={"strike3"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-start">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperVerticalRef.current.prevCallback()}
                />
              </div>
            </StepperPanel>
          </Stepper>
          <p className={"text-2xl ml-4 font-bold"}>
            Claim Rewards Using A Bolt11 Invoice:
          </p>
          <Stepper
            ref={stepperVerticalRef2}
            style={{ flexBasis: "50rem" }}
            orientation="vertical"
          >
            <StepperPanel header="Get a Lightning Wallet">
              <div className="flex flex-col">
                <li>
                  You will need to use a lightning wallet. You can download or
                  use a lightning wallet in your browser by using any of the
                  following services:
                  <div className={"flex flex-row gap-1 flex-wrap my-4"}>
                    {LN_ADDRESS_PROVIDERS.map((provider, _) => (
                      <Link
                        key={_}
                        href={provider.link}
                        className={
                          "w-[48%] md:w-64 h-48 bg-black flex flex-col items-center p-2 no-underline"
                        }
                      >
                        <Image
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
              </div>
              <div className="flex pt-4 justify-end">
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperVerticalRef2.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Create a Bolt11 Invoice">
              <div className="flex flex-col">
                <li>
                  Using a lightning wallet, create an invoice and set the amount
                  equal to that of the amount of your claimable reward.
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={alby0}
                    alt={"alby0"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby1}
                    alt={"alby1"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby2}
                    alt={"alby2"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-between">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperVerticalRef2.current.prevCallback()}
                />
                <Button
                  label="Next"
                  icon="pi pi-arrow-right"
                  iconPos="right"
                  onClick={() => stepperVerticalRef2.current.nextCallback()}
                />
              </div>
            </StepperPanel>
            <StepperPanel header="Claim your Reward">
              <div className="flex flex-col">
                <li>
                  Copy and paste your Bolt11 Invoice into the input box and
                  press the claim button after verifying that you have entered
                  your Bolt11 Invoice correctly.
                </li>
                <div
                  className={
                    "w-full flex flex-col md:flex-row gap-2 overflow-auto my-4"
                  }
                >
                  <ImagePreview
                    src={alby3}
                    alt={"alby3"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                  <ImagePreview
                    src={alby4}
                    alt={"alby4"}
                    className={"h-[400px] w-auto object-contain"}
                    preview={true}
                  />
                </div>
              </div>
              <div className="flex pt-4 justify-start">
                <Button
                  label="Back"
                  severity="secondary"
                  icon="pi pi-arrow-left"
                  onClick={() => stepperVerticalRef2.current.prevCallback()}
                />
              </div>
            </StepperPanel>
          </Stepper>
        </div>
      </div>
    </Dialog>
  );
}
