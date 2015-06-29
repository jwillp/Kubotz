package com.brm.GoatEngine;

import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.maps.tiled.renderers.OrthogonalTiledMapRenderer;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.EntityXMLFactory;
import com.brm.GoatEngine.ECS.common.PhysicsComponent;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.Kubotz.Common.Systems.PhysicsSystem;
import com.brm.Kubotz.Common.Systems.RendringSystems.RenderingSystem;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.GameRules.Components.PlayerScoreComponent;
import com.brm.Kubotz.Features.KubotzCharacter.Components.SkullHeadComponent;
import com.brm.Kubotz.Features.Respawn.Components.SpawnPointComponent;
import com.brm.Kubotz.Features.Rooms.Entities.BlockFactory;

import java.util.ArrayList;

/**
 * Class Used to read all the entities that need to be created
 * according to a tiled map (format)
 */
public class GameMap{

    private TiledMap tiledMap;
    private int tileSize;


    public class ObjectInfo{
        public final String blueprint;
        public final Vector2 position;

        public ObjectInfo(String blueprint, Vector2 position) {
            this.blueprint = blueprint;
            this.position = position;
        }
    }


    /**
     * Reads the map and returns a list of entity blueprints to create with their position
     * @param mapFile
     * @return
     */
    public ArrayList<ObjectInfo> read(String mapFile){

        // MAP
        //LOAD MAP
        tiledMap = new TmxMapLoader().load(mapFile);
        tileSize = tiledMap.getProperties().get("tilewidth", Integer.class);

        ArrayList<ObjectInfo> objects = new ArrayList<ObjectInfo>();
        MapObjects mapObjects = tiledMap.getLayers().get("objects").getObjects();

        for(int i=0; i<mapObjects.getCount(); i++){

            RectangleMapObject obj = (RectangleMapObject) mapObjects.get(i);
            Rectangle rect = obj.getRectangle();
            String blueprint = obj.getProperties().get("blueprint").toString();
            Vector2 position = new Vector2(rect.getX()/tileSize, rect.getY()/tileSize);

            objects.add(new ObjectInfo(blueprint, position));
        }


        return objects;
    }
}