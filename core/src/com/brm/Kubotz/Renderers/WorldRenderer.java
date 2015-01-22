package com.brm.Kubotz.Renderers;


import com.brm.GoatEngine.ECS.Entity.Entity;

import java.util.ArrayList;

public class WorldRenderer {


    private ArrayList<Entity> entities;


    public WorldRenderer(ArrayList<Entity> entities){

        this.entities = entities;

        // Camera Setup


    }


    /**
     * Updates all visual elements (E.g.: Animation frames)
     */
    public void update(){
        // TODO Update the renderers of all the GameObjects

    }

    /**
     * Draws the elements on screen
     */
    public void draw(){
        // TODO Draw all the gameObjects using their renderers
        for(Entity go: this.entities){

        }

        /*if(Config.QUADTREE_RENDERING_ENABLED) {
            QuadTreeRenderer qr = new QuadTreeRenderer();
            qr.render(this.quadTree, this.camera);
         }*/
    }


}
