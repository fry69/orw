import { FC, ReactNode } from "react";
import { showPricePerMillion, showPricePerThousand } from "./utils";
import { Model } from "../shared/global";

/**
 * Properties for PriceElement component.
 */
export interface PriceElementProps {
  /** The prefix text to be displayed before the price. */
  prefix: string;
  /** The price to be displayed. */
  price: string;
  /** The unit of the price. */
  unit: string;
  /** Whether to format the price per thousand or per million. */
  thousands?: boolean;
}

/**
 * PriceElement component displays the price of a specific unit.
 * If the price is greater than 0, it displays the formatted price.
 * @param props - The properties of the PriceElement component.
 * @returns - The formatted price element if the price is greater than 0.
 */
export const PriceElement: FC<PriceElementProps> = ({
  prefix,
  price,
  unit,
  thousands = false,
}: PriceElementProps): ReactNode => {
  if (parseFloat(price) > 0) {
    const formattedPrice = thousands
      ? showPricePerThousand(price, unit)
      : showPricePerMillion(price, unit);
    return (
      <>
        {prefix}
        <b>{formattedPrice}</b>
      </>
    );
  }
};

/**
 * Properties for Price component.
 */
export interface PriceProps {
  /** The model object containing pricing information. */
  model: Model;
}

/**
 * Price component displays the price of the model.
 * If the model is free, it displays "Free".
 * If the model is "openrouter/auto", it displays "See model".
 * Otherwise, it displays the price for input, output, request, and image.
 * @param props - The properties of the Price component.
 * @returns The price component.
 */
export const Price: FC<PriceProps> = ({ model }: PriceProps): ReactNode => {
  if (model.id === "openrouter/auto") {
    return (
      <>
        <p style={{ fontSize: "large" }}>
          <b>See model</b>
        </p>
      </>
    );
  }
  if (parseFloat(model.pricing.completion) > 0) {
    return (
      <>
        <p className="price-container" style={{ fontSize: "large" }}>
          <PriceElement prefix="Input:" price={model.pricing.prompt} unit="tokens" />
          <PriceElement prefix="Output:" price={model.pricing.completion} unit="tokens" />
          <PriceElement prefix="Request:" price={model.pricing.request} unit="requests" thousands />
          <PriceElement prefix="Image:" price={model.pricing.image} unit="images" thousands />
        </p>
      </>
    );
  }
  return (
    <>
      <p style={{ fontSize: "large", color: "green" }}>
        <b>Free</b>
      </p>
    </>
  );
};
