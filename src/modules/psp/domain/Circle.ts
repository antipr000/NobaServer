import Joi from "joi";
import { Circle as CircleProps } from "@prisma/client";
import { KeysRequired } from "../../../modules/common/domain/Types";
import { Entity, basePropsJoiSchemaKeys } from "../../../core/domain/Entity";
import { AggregateRoot } from "../../../core/domain/AggregateRoot";

const circleDataValidationJoiKeys: KeysRequired<CircleProps> = {
  ...basePropsJoiSchemaKeys,
  id: Joi.string().min(10).required(),
  walletID: Joi.string().required(),
  consumerID: Joi.string().required(),
};

export const circleJoiSchema = Joi.object(circleDataValidationJoiKeys).options({
  allowUnknown: false,
  stripUnknown: false,
});

export class Circle extends AggregateRoot<CircleProps> {
  private constructor(circleProps: CircleProps) {
    super(circleProps);
  }

  public static createCircle(circleProps: Partial<CircleProps>): Circle {
    if (!circleProps.id) circleProps.id = Entity.getNewID();

    return new Circle(Joi.attempt(circleProps, circleJoiSchema));
  }
}
