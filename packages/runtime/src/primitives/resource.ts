import type { KernelResourceBody, KernelResourceProvide, Plan } from "@khora/kernel";
import { BLUEPRINT_BRIDGE } from "#src/blueprint-bridge";
import type { RuntimePlan } from "#src/contracts";
import { resource as kernelResource } from "@khora/kernel";
import { liftPlan } from "#src/plan-lift";

export type RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) => RuntimePlan<never>;

export type RuntimeResourceBody<ProvidedValue> = (
  provide: RuntimeResourceProvide<ProvidedValue>,
) => RuntimePlan<unknown>;

function resourceKernelPrimitive<ProvidedValue>(
  runtimeBody: RuntimeResourceBody<ProvidedValue>,
): Plan<ProvidedValue> {
  const kernelBody: KernelResourceBody<ProvidedValue> = (
    kernelProvide: KernelResourceProvide<ProvidedValue>,
  ) => {
    const runtimeProvide: RuntimeResourceProvide<ProvidedValue> = (value: ProvidedValue) =>
      liftPlan(kernelProvide(value));

    return BLUEPRINT_BRIDGE.raise(() => runtimeBody(runtimeProvide))();
  };

  return kernelResource(kernelBody);
}

export const resource = <ProvidedValue>(
  body: RuntimeResourceBody<ProvidedValue>,
): RuntimePlan<ProvidedValue> => liftPlan(resourceKernelPrimitive(body));
