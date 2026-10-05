import React from 'react';
import type { NodeProps } from 'reactflow';

import type { WorkflowRefNodeData } from '../types/viewer';
import type { ViewerStep } from '../utils/model/viewerModel';
import { InspectionStepCard } from './StepNode';

export const WorkflowRefNode: React.FC<
  NodeProps<WorkflowRefNodeData & { inspectionStep?: ViewerStep }>
> = ({ data, selected, id }) => <InspectionStepCard data={data} selected={selected} id={id} />;
