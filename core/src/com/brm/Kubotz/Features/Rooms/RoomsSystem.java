package com.brm.Kubotz.Features.Rooms;

import com.badlogic.gdx.maps.MapObjects;
import com.badlogic.gdx.maps.objects.RectangleMapObject;
import com.badlogic.gdx.maps.tiled.TiledMap;
import com.badlogic.gdx.maps.tiled.TmxMapLoader;
import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.core.Entity;
import com.brm.GoatEngine.ECS.core.EntitySystem;
import com.brm.Kubotz.Common.Systems.PhysicsSystem;
import com.brm.Kubotz.Constants;
import com.brm.Kubotz.Features.GameRules.PlayerScoreComponent;
import com.brm.Kubotz.Features.KubotzCharacter.Entities.KubotzFactory;
import com.brm.Kubotz.Features.Respawn.SpawnPointComponent;

/**
 * Used to process Rooms
 */
public class RoomsSystem extends EntitySystem {
    /**
     * Used to initialise the system
     */
    @Override
    public void init() {
        for(Entity entity: this.getEntityManager().getEntitiesWithComponent(RoomComponent.ID)){
            RoomComponent room = (RoomComponent) entity.getComponent(RoomComponent.ID);
            if(!room.isLoaded()){
                this.loadRoom(room);
                room.setLoaded(true);
            }
        }

    }

    /**
     * Called once per game frame
     *
     * @param dt
     */
    @Override
    public void update(float dt) {

    }


    /**
     * Used to load a Map
     * @param room the room to load
     */
    public void loadRoom(RoomComponent room){
        TiledMap tiledMap = room.getTiledMap();
        tiledMap = new TmxMapLoader().load(Constants.MAIN_MAP_FILE);
        float tileSize = tiledMap.getProperties().get("tilewidth", Integer.class);


        //TODO Finish

        //mapRenderer = new OrthogonalTiledMapRenderer(tiledMap, 1/tileSize);


        MapObjects mapObjects = tiledMap.getLayers().get("objects").getObjects();


        for(int i=0; i<mapObjects.getCount(); i++){


            RectangleMapObject obj = (RectangleMapObject) mapObjects.get(i);
            Rectangle rect = obj.getRectangle();
            String objType = (String) obj.getProperties().get("type");
            Vector2 position = new Vector2(rect.getX()/tileSize, rect.getY()/tileSize);


            if(objType.equals("PLAYER_SPAWN")){
                Entity player = new KubotzFactory(getEntityManager(), getSystemManager().getSystem(PhysicsSystem.class).getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withHeight(2.0f)
                        .withCameraTargetComponent()
                        .build();
                player.addComponent(new PlayerScoreComponent(1), PlayerScoreComponent.ID);

                Entity entity = new Entity();
                getEntityManager().registerEntity(entity);
                entity.addComponent(new SpawnPointComponent(new Vector2(rect.getX()/tileSize, rect.getY()/tileSize),
                        SpawnPointComponent.Type.Player), SpawnPointComponent.ID);

            }else if(objType.equals("BONUS_SPAWN")){
                Entity entity = new Entity();
                getEntityManager().registerEntity(entity);
                entity.addComponent(new SpawnPointComponent(new Vector2(rect.getX()/tileSize, rect.getY()/tileSize),
                        SpawnPointComponent.Type.PowerUp), SpawnPointComponent.ID);


            }else{
                new BlockFactory(this.getEntityManager(), getSystemManager().getSystem(PhysicsSystem.class).getWorld(),
                        new Vector2(rect.getX()/tileSize, rect.getY()/tileSize))
                        .withSize(rect.getWidth()/tileSize, rect.getHeight()/tileSize)
                        .withTag(Constants.ENTITY_TAG_PLATFORM)
                        .build();
            }
        }



    }





}
