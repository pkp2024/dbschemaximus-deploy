import { toPng } from 'html-to-image';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import type { Node } from '@xyflow/react';

interface ExportImageOptions {
  nodes: Node[];
  backgroundColor?: string;
  fileName?: string;
  padding?: number;
}

export async function exportToPng(options: ExportImageOptions): Promise<void> {
  const { nodes, backgroundColor = '#ffffff', fileName = 'schema', padding = 50 } = options;

  if (nodes.length === 0) {
    alert('No tables to export. Please add some tables first.');
    return;
  }

  // Get the viewport element (not the whole canvas)
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) {
    throw new Error('Viewport not found');
  }

  // Calculate bounds of all nodes
  const nodesBounds = getNodesBounds(nodes);

  // Add padding to bounds
  const paddedBounds = {
    x: nodesBounds.x - padding,
    y: nodesBounds.y - padding,
    width: nodesBounds.width + padding * 2,
    height: nodesBounds.height + padding * 2,
  };

  // Calculate image dimensions
  const imageWidth = Math.ceil(paddedBounds.width);
  const imageHeight = Math.ceil(paddedBounds.height);

  // Get the parent container to apply proper transform
  const flowContainer = document.querySelector('.react-flow') as HTMLElement;
  if (!flowContainer) {
    throw new Error('Flow container not found');
  }

  // Generate PNG by capturing the viewport
  try {
    const dataUrl = await toPng(viewportElement, {
      backgroundColor,
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${-paddedBounds.x}px, ${-paddedBounds.y}px)`,
      },
      pixelRatio: 2, // Higher quality (2x resolution)
    });

    // Download the image
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error generating PNG:', error);
    throw new Error('Failed to generate PNG. Please try again.');
  }
}

export async function exportToSvg(options: ExportImageOptions): Promise<void> {
  const { fileName = 'schema' } = options;

  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewportElement) {
    throw new Error('Viewport not found');
  }

  // Clone the viewport
  const clonedElement = viewportElement.cloneNode(true) as HTMLElement;

  // Create SVG wrapper
  const svgString = new XMLSerializer().serializeToString(clonedElement);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  // Download
  const link = document.createElement('a');
  link.download = `${fileName}.svg`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}
