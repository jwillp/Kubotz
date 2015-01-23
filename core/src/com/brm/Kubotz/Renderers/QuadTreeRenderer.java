package com.brm.Kubotz.Renderers;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.brm.GoatEngine.Utils.QuadTree;


public class QuadTreeRenderer{

    private ShapeRenderer sr = new ShapeRenderer();
    private Color color;
    private QuadTree qt;


    public QuadTreeRenderer(ShapeRenderer sr){
        this.color = Color.BLUE;
        this.sr = sr;
    }



    public void update(QuadTree qt) {

    }


    public void draw(QuadTree qt, OrthographicCamera cam) {

        sr.setProjectionMatrix(cam.combined);
        sr.begin(ShapeRenderer.ShapeType.Line);
        sr.setColor(this.color); // RED
        sr.rect(qt.getBounds().x, qt.getBounds().y, qt.getBounds().width, qt.getBounds().height);
        sr.end();

        for(QuadTree node: qt.getNodes()){
            this.draw(node, cam);
        }

    }





}
