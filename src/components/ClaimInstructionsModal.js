import { Dialog } from "primereact/dialog";

export function ClaimInstructionsModal({ isVisible, onHide }) {
  return (
    <Dialog
      visible={isVisible}
      modal
      onHide={onHide}
      content={({ hide }) => (
        <div className={"bg-gray-900 rounded-lg max-w-xl h-96 flex flex-col"}>

          <div className={"w-full relative h-fit"}>
            <p className={"text-center text-2xl"}>How to Claim Rewards</p>
            <i
            className="pi pi-times-circle absolute top-2 right-2 cursor-pointer"
            onClick={hide}
          ></i>
          </div>
          <div
            className={"overflow-y-scroll flex flex-col flex-1 px-4"}
            style={{ scrollbarWidth: "none" }}
          >
            <p>Claim Rewards Using A Lightning Address:</p>
            <ul className="list-decimal flex flex-col gap-y-2">
              <li>
                You will need to obtain a LN Address. You can obtain a LN
                Address by using any of the following services:
                <ul>
                  <li>
                    <a href={"https://stacker.news/"}>Stacker News</a>
                  </li>
                  <li>
                    <a href={"https://strike.me"}>Strike</a>
                  </li>
                  <li>
                    <a href={"https://primal.net/"}>Primal</a>
                  </li>
                  <li>
                    <a href={"https://getalby.com/"}>Alby</a>
                  </li>
                  <li>
                    <a href={"https://zbd.gg/"}>ZBD</a>
                  </li>
                </ul>
              </li>
              <li>
                After creating an account using one of the services in the
                previous step, you will need to locate your LN Address. This
                should have been automatically created for you. Ex:
                (yourUsername@stacker.news, yourUsername@strike.me)
              </li>
              <li>
                Copy and paste your LN Address into the input box and press the
                claim button after verifying that you have entered your LN
                Address correctly.
              </li>
            </ul>
            <p>Claim Rewards Using A Bolt11 Invoice:</p>
            <ul className="list-decimal flex flex-col gap-y-2">
              <li>
                Open your preferred lightning wallet. (any of the services in
                the instructions for claiming rewards using a Lightning Address
                will also work)
              </li>
              <li>
                Using a lightning wallet, you can create an amountless invoice
                or set the amount equal to that of the amount of your claimable
                reward.
              </li>
              <li>
                Copy and paste your Bolt11 Invoice into the input box and press
                the claim button after verifying that you have entered your
                Bolt11 Invoice correctly.
              </li>
            </ul>
          </div>
        </div>
      )}
    ></Dialog>
  );
}
