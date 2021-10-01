import { IContentItem, Elements, IRichTextImage, ElementType, ILink } from '@kentico/kontent-delivery';
import { DocumentFragment, Element } from 'parse5';

export function getChildNodes(documentFragment: DocumentFragment | Element): Element[] {
    return documentFragment.childNodes as Element[];
}

export function getLinkedItem(linkedItems: IContentItem[], itemCodename: string): IContentItem | undefined {
    if (!linkedItems) {
        return undefined;
    }
    return linkedItems.find((m) => m.system.codename === itemCodename);
}

export function tryGetImage(
    inputElement: Elements.RichTextElement,
    linkedItems: IContentItem[],
    imageId: string
): IRichTextImage | undefined {
    const elementImage = inputElement.images.find((m) => m.imageId === imageId);
    if (elementImage) {
        return elementImage;
    }

    // try to find image in all linked items
    if (linkedItems) {
        for (const linkedItem of linkedItems) {
            for (const elementKey of Object.keys(linkedItem.elements)) {
                const element = linkedItem.elements[elementKey];
                if (element.type === ElementType.RichText) {
                    const richTextElement = element as Elements.RichTextElement;
                    const richTextElementImage = richTextElement.images.find((m) => m.imageId === imageId);
                    if (richTextElementImage) {
                        return richTextElementImage;
                    }
                }
            }
        }
    }

    return undefined;
}

export function tryGetLink(
    inputElement: Elements.RichTextElement,
    linkedItems: IContentItem[],
    linkId: string
): ILink | undefined {
    const elementLink = inputElement.links.find((m) => m.linkId === linkId);
    if (elementLink) {
        return elementLink;
    }

    // try to find image in all linked items
    if (linkedItems) {
        for (const linkedItem of linkedItems) {
            for (const elementKey of Object.keys(linkedItem.elements)) {
                const element = linkedItem.elements[elementKey];
                if (element.type === ElementType.RichText) {
                    const richTextElement = element as Elements.RichTextElement;
                    const richTextElementLink = richTextElement.links.find((m) => m.linkId === linkId);
                    if (richTextElementLink) {
                        return richTextElementLink;
                    }
                }
            }
        }
    }

    return undefined;
}
