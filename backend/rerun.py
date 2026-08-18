from app.routers.recordings import process_voice_analysis_pipeline

recording_id = "8e7657b2-be5c-4ce9-a1d3-9fb216d49043"

def main():
    process_voice_analysis_pipeline(recording_id)

if __name__ == "__main__":
    main()
