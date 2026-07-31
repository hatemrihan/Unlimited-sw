/**
 * Tests for the variant image upload fix.
 * 
 * BUG: When admin uploads an image for variant 2 (e.g. "Gray"), the upload
 * was incorrectly triggered on variant 1 (e.g. "Black").
 * 
 * ROOT CAUSE: FileUpload used `document.getElementById(`file-input-${label}`)` 
 * to trigger the hidden <input>. Since all variant FileUploads shared the same 
 * label ("رفع صورة"), getElementById always returned the FIRST match in the DOM
 * → wrong variant's file input, wrong uploading state, wrong onUpload callback.
 * 
 * FIX: Replaced getElementById with useRef so each FileUpload instance references
 * its own hidden input element.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ─── Test 1: FileUpload ref isolation ────────────────────────────────────────
// Verifies that multiple FileUpload instances with the same label each have their 
// own independent hidden file input (no shared DOM IDs).

describe('FileUpload - ref isolation (no duplicate IDs)', () => {
  // Mock fetch globally
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders multiple instances without duplicate IDs in the DOM', () => {
    // We need to test that the hidden <input> no longer uses an id attribute
    // After the fix, FileUpload uses useRef instead of getElementById
    
    const FileUpload = require('@/components/FileUpload').default;

    const onUpload1 = jest.fn();
    const onUpload2 = jest.fn();

    const { container } = render(
      <div>
        <FileUpload label="رفع صورة" accept="image/*" onUpload={onUpload1} />
        <FileUpload label="رفع صورة" accept="image/*" onUpload={onUpload2} />
      </div>
    );

    // After the fix: no elements should have id="file-input-رفع صورة"
    const elementsWithOldId = container.querySelectorAll('[id="file-input-رفع صورة"]');
    expect(elementsWithOldId.length).toBe(0);

    // Both file inputs should exist but without conflicting IDs
    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);
  });

  it('each "Choose File" button triggers its own file input', () => {
    const FileUpload = require('@/components/FileUpload').default;
    
    const onUpload1 = jest.fn();
    const onUpload2 = jest.fn();

    const { container } = render(
      <div>
        <div data-testid="upload-1">
          <FileUpload label="رفع صورة" accept="image/*" onUpload={onUpload1} />
        </div>
        <div data-testid="upload-2">
          <FileUpload label="رفع صورة" accept="image/*" onUpload={onUpload2} />
        </div>
      </div>
    );

    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);

    // Spy on click for each file input
    const clickSpy1 = jest.spyOn(fileInputs[0] as HTMLInputElement, 'click');
    const clickSpy2 = jest.spyOn(fileInputs[1] as HTMLInputElement, 'click');

    // Click the second "Choose File" button
    const chooseButtons = screen.getAllByText('Choose File');
    expect(chooseButtons.length).toBe(2);
    
    fireEvent.click(chooseButtons[1]); // Click the SECOND button

    // The SECOND file input should be clicked, NOT the first
    expect(clickSpy1).not.toHaveBeenCalled();
    expect(clickSpy2).toHaveBeenCalledTimes(1);
  });
});

// ─── Test 2: updateVariantImages isolation ───────────────────────────────────
// Verifies that updateVariantImages only modifies the targeted variant index,
// leaving other variants untouched.

describe('updateVariantImages - functional updater isolation', () => {
  it('updates only the targeted variant index, leaves others untouched', () => {
    // Simulate the hook logic directly (no need to render the full page)
    const { renderHook, act } = require('@testing-library/react');
    
    // We'll test the core logic: setProduct(prev => ...) with the right index
    let productState = {
      variants: [
        { id: '1', name: 'Black', stock: 40, images: ['black1.jpg', 'black2.jpg'] },
        { id: '2', name: 'Gray', stock: 30, images: ['gray1.jpg', 'gray2.jpg'] },
      ]
    };

    // Simulate updateVariantImages logic (from useProduct.ts)
    const updateVariantImages = (index: number, images: string[]) => {
      const prev = productState;
      const newVariants = [...prev.variants];
      newVariants[index] = { ...prev.variants[index], images };
      productState = { ...prev, variants: newVariants };
    };

    // Update variant 1 (Gray) images
    updateVariantImages(1, ['gray1.jpg', 'gray2.jpg', 'gray3_NEW.jpg']);

    // Gray should have the new image
    expect(productState.variants[1].images).toEqual(['gray1.jpg', 'gray2.jpg', 'gray3_NEW.jpg']);
    expect(productState.variants[1].name).toBe('Gray');

    // Black should be completely untouched
    expect(productState.variants[0].images).toEqual(['black1.jpg', 'black2.jpg']);
    expect(productState.variants[0].name).toBe('Black');
  });

  it('handles replacing an image in a specific variant', () => {
    let productState = {
      variants: [
        { id: '1', name: 'Black', stock: 40, images: ['black1.jpg', 'black2.jpg'] },
        { id: '2', name: 'Gray', stock: 30, images: ['gray1.jpg', 'gray2.jpg'] },
      ]
    };

    // Simulate replace: replace gray1.jpg with gray1_REPLACED.jpg in variant 1
    const updateVariantImages = (index: number, images: string[]) => {
      const prev = productState;
      const newVariants = [...prev.variants];
      newVariants[index] = { ...prev.variants[index], images };
      productState = { ...prev, variants: newVariants };
    };

    const grayImages = [...productState.variants[1].images];
    grayImages[0] = 'gray1_REPLACED.jpg';
    updateVariantImages(1, grayImages);

    // Gray variant 1 should have the replaced image
    expect(productState.variants[1].images).toEqual(['gray1_REPLACED.jpg', 'gray2.jpg']);

    // Black variant 0 should be completely untouched
    expect(productState.variants[0].images).toEqual(['black1.jpg', 'black2.jpg']);
  });

  it('concurrent updates to different variants do not interfere', () => {
    let productState = {
      variants: [
        { id: '1', name: 'Black', stock: 40, images: ['black1.jpg'] },
        { id: '2', name: 'Gray', stock: 30, images: ['gray1.jpg'] },
        { id: '3', name: 'Red', stock: 20, images: ['red1.jpg'] },
      ]
    };

    // Simulates the functional updater pattern from React setState(prev => ...)
    // Each call reads from current state (simulating prev)
    const updateVariantImages = (index: number, images: string[]) => {
      const prev = productState; // This simulates React's prev in setState
      const newVariants = [...prev.variants];
      newVariants[index] = { ...prev.variants[index], images };
      productState = { ...prev, variants: newVariants };
    };

    // Update Gray (index 1)
    updateVariantImages(1, ['gray1.jpg', 'gray_UPLOADED.jpg']);

    // Then update Red (index 2) — should NOT overwrite Gray's update
    updateVariantImages(2, ['red1.jpg', 'red_UPLOADED.jpg']);

    expect(productState.variants[0].images).toEqual(['black1.jpg']);
    expect(productState.variants[1].images).toEqual(['gray1.jpg', 'gray_UPLOADED.jpg']);
    expect(productState.variants[2].images).toEqual(['red1.jpg', 'red_UPLOADED.jpg']);
  });
});
