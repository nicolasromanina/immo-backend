import { Request, Response } from 'express';
import { OpenGraphService } from '../services/OpenGraphService';

export const getProjectOG = async (req: Request, res: Response) => {
  try {
    const og = await OpenGraphService.generateProjectOG(req.params.projectId);
    res.json(og);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getProjectMetaTags = async (req: Request, res: Response) => {
  try {
    const metaTags = await OpenGraphService.generateMetaTags(req.params.projectId);
    res.type('text/html').send(metaTags);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getShareLinks = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title } = req.query;
    const links = OpenGraphService.generateShareLinks(
      projectId,
      (title as string) || 'Découvrez ce projet immobilier'
    );
    res.json(links);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
